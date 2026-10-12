import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { CONTRACTS } from "../config/contracts";
import { toast, parseContractError } from "./Toast";
import P256Abi from "../abi/P256PolicyAuth.json";

interface PasskeyAuthProps {
  onSuccess?: () => void;
}

export function PasskeyAuth({ onSuccess }: PasskeyAuthProps) {
  const { provider: walletProvider } = useWallet();
  const [status, setStatus] = useState<"idle" | "registering" | "submitting" | "registered" | "signing" | "signed">("idle");
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [needsWallet, setNeedsWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = status === "registering" || status === "submitting";

  async function registerPasskey() {
    // The on-chain registration tx needs a connected wallet — prompt instead of failing silently.
    if (!walletProvider) {
      setNeedsWallet(true);
      return;
    }
    setNeedsWallet(false);
    setError(null);
    setStatus("registering");
    let phase: "ceremony" | "tx" = "ceremony";
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

      const rawId = Array.from(new Uint8Array(credential.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      setCredentialId(rawId);

      // Extract P256 public key from attestation for on-chain registration:
      // CBOR attestationObject → authData → COSE_Key (EC2/P-256) → (x, y)
      const response = credential.response as AuthenticatorAttestationResponse;
      const pubKey = extractP256PublicKey(response.attestationObject);

      // P256PolicyAuth.registerPasskey(bytes32 credentialId, bytes32 x, bytes32 y).
      // The WebAuthn credential ID is variable-length, so we pass keccak256(rawId)
      // as the bytes32 credentialId (the contract derives passkeyId = keccak256(credentialId)).
      // x/y are 32-byte big-endian — byte-identical to the uint256 encoding.
      phase = "tx";
      setStatus("submitting");
      const browserProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await browserProvider.getSigner();
      const p256 = new ethers.Contract(CONTRACTS.P256PolicyAuth, P256Abi.abi, signer);
      const credentialIdBytes32 = ethers.keccak256(new Uint8Array(credential.rawId));
      const tx = await p256.registerPasskey(credentialIdBytes32, pubKey.x, pubKey.y);
      await tx.wait();

      toast.success("Passkey registered on-chain");
      setStatus("registered");
      onSuccess?.();
    } catch (err: any) {
      console.error("Passkey registration failed:", err);

      // Already on-chain — graceful, nothing left to do
      if (err?.revert?.name === "PasskeyAlreadyRegistered" || String(err?.message || "").includes("PasskeyAlreadyRegistered")) {
        toast.success("This passkey is already registered on-chain");
        setStatus("registered");
        onSuccess?.();
        return;
      }

      const msg =
        phase === "ceremony"
          ? err?.name === "NotAllowedError"
            ? "Passkey creation was cancelled or timed out — try again"
            : err?.message || "Passkey registration failed"
          : parseContractError(err);
      setError(msg);
      toast.error(msg);
      setStatus("idle");
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

      {needsWallet && (
        <div className="monad-note" style={{ marginBottom: "12px" }}>
          Connect your wallet first — click Connect Wallet in the top right, then register your passkey.
        </div>
      )}

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

      {status === "submitting" && (
        <div className="passkey-status">
          <div className="spinner" />
          <span>Registering passkey on-chain...</span>
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

// ─────────────────────────── WebAuthn / CBOR helpers ───────────────────────────
//
// Minimal CBOR decoder (RFC 8949) — just enough to walk the WebAuthn attestation
// chain: attestationObject (CBOR map) → authData → attestedCredentialData → COSE_Key.
// COSE_Key for EC2/P-256: { 1: 2 (kty=EC2), 3: -7 (alg=ES256), -1: 1 (crv=P-256),
// -2: x (bstr 32), -3: y (bstr 32) }.

interface CborItem {
  value: unknown;
  next: number;
}

function cborDecode(buf: Uint8Array, offset: number): CborItem {
  if (offset >= buf.length) throw new Error("CBOR: unexpected end of input");
  const initial = buf[offset++];
  const major = initial >> 5;
  const info = initial & 0x1f;

  // Decode the argument / length that follows the initial byte
  let arg: number | bigint;
  if (info < 24) arg = info;
  else if (info === 24) arg = buf[offset++];
  else if (info === 25) {
    arg = (buf[offset] << 8) | buf[offset + 1];
    offset += 2;
  } else if (info === 26) {
    arg = ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
    offset += 4;
  } else if (info === 27) {
    let v = 0n;
    for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(buf[offset + i]);
    offset += 8;
    arg = v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v;
  } else if (info === 31) {
    arg = -1; // indefinite-length marker (handled per major type below)
  } else {
    throw new Error(`CBOR: unsupported additional info ${info}`);
  }

  switch (major) {
    case 0: // unsigned int
      return { value: Number(arg), next: offset };
    case 1: // negative int
      return { value: -1 - Number(arg), next: offset };
    case 2: { // byte string
      if (arg === -1) throw new Error("CBOR: indefinite byte strings not supported");
      const len = Number(arg);
      return { value: buf.slice(offset, offset + len), next: offset + len };
    }
    case 3: { // text string
      if (arg === -1) throw new Error("CBOR: indefinite text strings not supported");
      const len = Number(arg);
      return { value: new TextDecoder().decode(buf.slice(offset, offset + len)), next: offset + len };
    }
    case 4: { // array
      const items: unknown[] = [];
      if (arg === -1) {
        while (buf[offset] !== 0xff) {
          const item = cborDecode(buf, offset);
          items.push(item.value);
          offset = item.next;
        }
        return { value: items, next: offset + 1 };
      }
      for (let i = 0; i < Number(arg); i++) {
        const item = cborDecode(buf, offset);
        items.push(item.value);
        offset = item.next;
      }
      return { value: items, next: offset };
    }
    case 5: { // map — kept as a Map so integer keys (COSE) survive
      const map = new Map<unknown, unknown>();
      const readPair = () => {
        const k = cborDecode(buf, offset);
        const v = cborDecode(buf, k.next);
        map.set(k.value, v.value);
        offset = v.next;
      };
      if (arg === -1) {
        while (buf[offset] !== 0xff) readPair();
        return { value: map, next: offset + 1 };
      }
      for (let i = 0; i < Number(arg); i++) readPair();
      return { value: map, next: offset };
    }
    case 6: // tag — skip the tag, decode the tagged item
      return cborDecode(buf, offset);
    case 7: // simple / float
      if (info === 20) return { value: false, next: offset };
      if (info === 21) return { value: true, next: offset };
      if (info === 22) return { value: null, next: offset };
      if (info === 23) return { value: undefined, next: offset };
      throw new Error("CBOR: unsupported simple/float value");
    default:
      throw new Error(`CBOR: unsupported major type ${major}`);
  }
}

/** COSE coordinates are big-endian unsigned; left-pad to 32 bytes for the bytes32 args. */
function toBytes32Hex(b: Uint8Array): string {
  if (b.length > 32) throw new Error("passkey coordinate larger than 32 bytes");
  const padded = new Uint8Array(32);
  padded.set(b, 32 - b.length);
  return (
    "0x" +
    Array.from(padded)
      .map(v => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Parse a WebAuthn attestationObject and extract the EC2/P-256 public key (x, y)
 * as 32-byte big-endian hex strings, matching P256PolicyAuth.registerPasskey's
 * bytes32 encoding.
 */
function extractP256PublicKey(attestationObject: ArrayBuffer): { x: string; y: string } {
  const { value } = cborDecode(new Uint8Array(attestationObject), 0);
  const authData = value instanceof Map ? (value.get("authData") as Uint8Array | undefined) : undefined;
  if (!(authData instanceof Uint8Array)) throw new Error("attestation response has no authData");

  const flags = authData[32];
  if ((flags & 0x40) === 0) throw new Error("authenticator returned no attested credential data");

  let offset = 37; // rpIdHash(32) + flags(1) + signCount(4)
  offset += 16; // aaguid
  const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
  offset += 2 + credentialIdLength; // skip credentialId (we use credential.rawId)

  const { value: cose } = cborDecode(authData, offset);
  if (!(cose instanceof Map)) throw new Error("invalid COSE key in attestation");
  const kty = cose.get(1);
  const crv = cose.get(-1);
  const xBytes = cose.get(-2);
  const yBytes = cose.get(-3);
  if (kty !== 2 || crv !== 1 || !(xBytes instanceof Uint8Array) || !(yBytes instanceof Uint8Array)) {
    throw new Error(
      `this passkey is not an EC2/P-256 credential (kty=${kty}, crv=${crv}) — use a platform passkey with ES256`
    );
  }

  return { x: toBytes32Hex(xBytes), y: toBytes32Hex(yBytes) };
}
