import { useState } from "react";
import { toast } from "sonner";
import {
  saveAgentMetadata,
  loadAgentMetadata,
  clearAgentMetadata,
  hasStoredAgentMetadata,
  meraErrorMessage,
  type AgentMetadataRecord,
} from "../lib/agentVault";

interface AgentMetadataVaultProps {
  agentAddress: string;
  metadata: string;
  txHash: string;
}

/**
 * Encrypted local vault for the agent registration record, powered by Mera's
 * passkey PRF extension (see src/lib/agentVault.ts for the PRF namespace usage).
 * One passkey, many keys: the same passkey that authorizes policy changes also
 * derives the local encryption key — no account, no seed phrase, no plaintext.
 */
export function AgentMetadataVault({ agentAddress, metadata, txHash }: AgentMetadataVaultProps) {
  const [busy, setBusy] = useState<"save" | "load" | "clear" | null>(null);
  const [saved, setSaved] = useState(() => hasStoredAgentMetadata());
  const [record, setRecord] = useState<AgentMetadataRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy("save");
    setError(null);
    try {
      await saveAgentMetadata({
        agentAddress,
        metadata,
        txHash,
        savedAt: new Date().toISOString(),
      });
      setSaved(true);
      toast.success("Agent metadata saved to the encrypted local vault");
    } catch (err) {
      const msg = meraErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function onLoad() {
    setBusy("load");
    setError(null);
    try {
      const rec = await loadAgentMetadata();
      setRecord(rec);
      if (rec) toast.success("Local vault decrypted with your passkey");
    } catch (err) {
      const msg = meraErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  function onClear() {
    clearAgentMetadata();
    setSaved(false);
    setRecord(null);
    setError(null);
    toast.success("Local vault cleared");
  }

  return (
    <div className="monad-note" style={{ marginTop: 16, textAlign: "left" }}>
      <strong>Encrypted local vault — Mera passkey</strong>
      <p style={{ margin: "8px 0" }}>
        Save this registration's metadata encrypted with your passkey via Mera's WebAuthn PRF
        extension. Nothing is stored in plaintext — only your passkey can decrypt it.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onSave} className="btn btn-secondary btn-sm" disabled={busy !== null}>
          {busy === "save" ? "Encrypting..." : saved ? "Re-save to vault" : "Save to vault"}
        </button>
        {saved && (
          <button onClick={onLoad} className="btn btn-secondary btn-sm" disabled={busy !== null}>
            {busy === "load" ? "Decrypting..." : "View vault"}
          </button>
        )}
        {saved && (
          <button onClick={onClear} className="btn btn-secondary btn-sm" disabled={busy !== null}>
            Clear
          </button>
        )}
      </div>

      {record && (
        <div className="passkey-id" style={{ marginTop: 10 }}>
          <div>Agent: {record.agentAddress}</div>
          <div>Metadata: {record.metadata || "(none)"}</div>
          <div>Tx: {record.txHash.slice(0, 18)}...</div>
          <div>Saved: {new Date(record.savedAt).toLocaleString()}</div>
        </div>
      )}

      {error && <div className="error-message" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
