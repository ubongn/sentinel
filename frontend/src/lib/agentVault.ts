import {
  createSecretVaultWithExistingPasskey,
  decryptSecretVaultWithPasskey,
  parseSecretVault,
  isMeraError,
} from "@category-labs/mera";
import type { PasskeyCredentialMetadata, PasskeySecretVault } from "@category-labs/mera";

/**
 * Agent metadata vault — Mera passkey PRF integration.
 *
 * ── WebAuthn PRF namespace usage ─────────────────────────────────────────────
 * "One passkey, many keys": the SAME passkey that registers the operator's
 * P-256 identity key on-chain (P256PolicyAuth) also unlocks a completely
 * separate local encryption key through Mera's WebAuthn PRF extension:
 *
 *   passkey ──(WebAuthn PRF)──► 32 secret bytes ──(HKDF)──► AES-256-GCM key
 *                                        │
 *                                        └─ Mera derives the encryption key
 *                                           with fixed HKDF info
 *                                           `mera.v1.encrypt.secret`, keeping
 *                                           it isolated from every other key
 *                                           derived from the same PRF output.
 *
 * PRF namespace details (per @category-labs/mera):
 *   • The PRF output is a deterministic function of (credential, rpId, salt).
 *   • Mera's default PRF salt is sha256("mera.prf.salt.v1"); secret vaults
 *     instead generate a FRESH random 32-byte salt per vault and store it in
 *     the vault JSON, so every save re-keys the AES-GCM encryption.
 *   • The PRF bits are non-account work: they never derive a wallet here —
 *     they only encrypt local storage at rest.
 *
 * What is stored in localStorage (`sentinel.agent_metadata.v1`) is a
 * PasskeySecretVault JSON: credential metadata + PRF salt + AES-GCM
 * nonce/ciphertext. The agent metadata plaintext touches localStorage ONLY
 * after being encrypted; it is never written unencrypted. Credential metadata
 * (base64url credentialId) holds no key material and is safe to persist.
 */

const VAULT_STORAGE_KEY = "sentinel.agent_metadata.v1";
const CREDENTIAL_HINT_KEY = "sentinel.mera_credential.v1";

/** The agent registration record kept in the encrypted vault. */
export interface AgentMetadataRecord {
  agentAddress: string;
  metadata: string;
  txHash: string;
  savedAt: string;
}

function rpId(): string {
  return window.location.hostname;
}

/** Credential hint so the authenticator goes straight to the right passkey. */
function credentialHint(): PasskeyCredentialMetadata | undefined {
  try {
    const raw = localStorage.getItem(CREDENTIAL_HINT_KEY);
    return raw ? (JSON.parse(raw) as PasskeyCredentialMetadata) : undefined;
  } catch {
    return undefined;
  }
}

/** True when an encrypted vault exists in local storage. */
export function hasStoredAgentMetadata(): boolean {
  return localStorage.getItem(VAULT_STORAGE_KEY) !== null;
}

/**
 * Encrypts an agent metadata record with the user's passkey (one biometric
 * prompt) and stores the vault in localStorage.
 */
export async function saveAgentMetadata(record: AgentMetadataRecord): Promise<void> {
  const secret = new TextEncoder().encode(JSON.stringify(record));
  const vault = await createSecretVaultWithExistingPasskey({
    rpId: rpId(),
    credential: credentialHint(),
    secret,
  });
  // Plaintext never reaches localStorage — only the passkey-protected vault does.
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  // Remember which passkey unlocked the vault (metadata only, no key material).
  localStorage.setItem(CREDENTIAL_HINT_KEY, JSON.stringify(vault.credential));
}

/**
 * Decrypts the local vault with the user's passkey (one biometric prompt).
 * Returns null when no vault is stored.
 */
export async function loadAgentMetadata(): Promise<AgentMetadataRecord | null> {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) return null;
  const vault: PasskeySecretVault = parseSecretVault(JSON.parse(raw));
  const secret = await decryptSecretVaultWithPasskey({ rpId: rpId(), vault });
  return JSON.parse(new TextDecoder().decode(secret)) as AgentMetadataRecord;
}

/** Removes the encrypted vault (and the credential hint) from local storage. */
export function clearAgentMetadata(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem(CREDENTIAL_HINT_KEY);
}

/** Maps MeraError codes to user-readable guidance. */
export function meraErrorMessage(err: unknown): string {
  if (isMeraError(err)) {
    switch (err.code) {
      case "PRF_UNAVAILABLE":
        return "This passkey provider does not support the WebAuthn PRF extension — iCloud Keychain, 1Password, and Google Password Manager do (Chrome's local-profile passkeys do not).";
      case "PASSKEY_OPERATION_FAILED":
        return "Passkey prompt was cancelled or failed — try again.";
      case "DECRYPT_FAILED":
        return "Could not decrypt the local vault — it may have been saved with a different passkey.";
      case "VAULT_FORMAT_INVALID":
        return "The stored vault is malformed — clear it and save again.";
      case "CRYPTO_UNAVAILABLE":
        return "Web Crypto is unavailable — open the app over HTTPS or localhost.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
