import { useState } from "react";
import { useSentinel } from "../hooks/useSentinel";

interface PasskeyAuthProps {
  onSuccess?: () => void;
}

export function PasskeyAuth({ onSuccess }: PasskeyAuthProps) {
  const { loading, error } = useSentinel();
  const [status, setStatus] = useState<"idle" | "registering" | "registered" | "signing" | "signed">("idle");
  const [credentialId, setCredentialId] = useState<string | null>(null);

  async function registerPasskey() {
    setStatus("registering");
    try {
      // WebAuthn registration flow
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          rp: { name: "Sentinel", id: window.location.hostname },
          user: {
            id: userId,
            name: "sentinel-user",
            displayName: "Sentinel User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256 (P-256)
            { alg: -257, type: "public-key" },  // RS256
          ],
          challenge,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        setStatus("idle");
        return;
      }

      const rawId = Buffer.from(credential.rawId).toString("hex");
      setCredentialId(rawId);
      setStatus("registered");

      // Extract P256 public key from attestation for on-chain registration
      const response = credential.response as AuthenticatorAttestationResponse;
      const attestationObject = response.attestationObject;
      // In production: parse CBOR attestationObject to get public key (x, y)
      // and call P256PolicyAuth.registerPasskey(credentialId, x, y)
      console.log("Passkey registered:", rawId, "attestation:", attestationObject.byteLength, "bytes");

      onSuccess?.();
    } catch (err: any) {
      console.error("Passkey registration failed:", err);
      setStatus("idle");
    }
  }

  async function signWithPasskey(policyHash: string) {
    if (!credentialId) return;
    setStatus("signing");
    try {
      const challenge = new TextEncoder().encode(policyHash);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) {
        setStatus("registered");
        return;
      }

      const response = assertion.response as AuthenticatorAssertionResponse;
      const signature = new Uint8Array(response.signature);
      // In production: construct r,s from DER-encoded P256 signature
      // and call P256PolicyAuth.authorizePolicyChange(credentialId, policyHash, sig, nonce, timestamp)
      console.log("Signed policy hash:", policyHash, "signature length:", signature.length);

      setStatus("signed");
    } catch (err: any) {
      console.error("Signing failed:", err);
      setStatus("registered");
    }
  }

  return (
    <div className="passkey-auth">
      <div className="passkey-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Passkey Authentication</span>
      </div>

      <p className="passkey-desc">
        Use your device's biometric authentication (Face ID, Touch ID, Windows Hello) to authorize
        policy changes. No seed phrases needed.
      </p>

      {status === "idle" && (
        <button onClick={registerPasskey} className="btn btn-primary" disabled={loading}>
          Register Passkey
        </button>
      )}

      {status === "registering" && (
        <div className="passkey-status">
          <div className="spinner" />
          <span>Waiting for biometric confirmation...</span>
        </div>
      )}

      {status === "registered" && (
        <div className="passkey-registered">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Passkey registered. Ready to authorize policy changes.</span>
        </div>
      )}

      {status === "signing" && (
        <div className="passkey-status">
          <div className="spinner" />
          <span>Waiting for signature confirmation...</span>
        </div>
      )}

      {status === "signed" && (
        <div className="passkey-registered">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Policy change authorized via passkey.</span>
        </div>
      )}

      {credentialId && status === "registered" && (
        <p className="passkey-id">
          Credential: {credentialId.slice(0, 16)}...
        </p>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
