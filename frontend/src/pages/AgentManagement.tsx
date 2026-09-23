import { useState } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { MONAD_EXPLORER } from "../config/contracts";
import { PasskeyAuth } from "../components/PasskeyAuth";
import { CleanverseVerification } from "../components/CleanverseVerification";
import { SmartAccountUpgrade } from "../components/SmartAccountUpgrade";
import { toast } from "sonner";

export function AgentManagement() {
  const { registerAgent, setPolicyForAgent, pauseAgent, unpauseAgent, loading } = useSentinel();
  const [agentAddress, setAgentAddress] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [metadata, setMetadata] = useState("");
  const [action, setAction] = useState<"register" | "assign" | "pause" | "unpause" | "smart-account">("register");
  const [result, setResult] = useState<string | null>(null);
  const [cleanverseVerified, setCleanverseVerified] = useState(false);
  const [_passkeyRegistered, setPasskeyRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (action === "register" && !cleanverseVerified) {
      return;
    }
    try {
      let txHash: string;
      switch (action) {
        case "register": {
          const policyHash = `0x${"0".repeat(64)}`; // placeholder — real policy hash from chain
          txHash = await registerAgent(agentAddress, policyHash, metadata);
          break;
        }
        case "assign":
          txHash = await setPolicyForAgent(agentAddress, BigInt(policyId));
          break;
        case "pause":
          txHash = await pauseAgent(agentAddress);
          break;
        case "unpause":
          txHash = await unpauseAgent(agentAddress);
          break;
        default: return;
      }
      setResult(txHash);
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
    } catch (err: any) {
      // Error toast handled by useSentinel hook
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Agent Management</h1>
        <p>Register agents, assign policies, and control agent activity.</p>
      </div>

      <div className="action-tabs">
        {(["register", "assign", "pause", "unpause", "smart-account"] as const).map(a => (
          <button
            key={a}
            className={`tab ${action === a ? "active" : ""}`}
            onClick={() => { setAction(a); setResult(null); }}
          >
            {a === "smart-account" ? "Smart Account" : a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>

      {result ? (
        <div className="success-card">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#22C55E" strokeWidth="2" fill="none" />
            <path d="M16 24l5 5 11-11" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2>Transaction Successful</h2>
          <p className="mono">
            <a href={`${MONAD_EXPLORER}/tx/${result}`} target="_blank" rel="noopener noreferrer">
              {result.slice(0, 18)}...
            </a>
          </p>
          <button className="btn btn-secondary" style={{ marginTop: "16px" }} onClick={() => setResult(null)}>Continue</button>
        </div>
      ) : action === "smart-account" ? (
        /* ─── Smart Account (EIP-7702) Upgrade ─── */
        <div style={{ maxWidth: "640px" }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: 16 }}>
              Upgrade your agent to use EIP-7702 delegation. Once upgraded, the agent's EOA runs
              SentinelAccount's code — every transaction goes through guardrail checks automatically.
              The agent cannot bypass Sentinel.
            </p>
            <div className="form-group">
              <label htmlFor="agentAddressSA">Agent EOA Address</label>
              <input
                type="text" id="agentAddressSA"
                value={agentAddress} onChange={e => setAgentAddress(e.target.value)}
                placeholder="0x... (the agent's EOA address)"
              />
            </div>
          </div>
          <SmartAccountUpgrade
            agentAddress={agentAddress}
            onStatusChange={(active) => {
              if (active) toast.success("Smart account is active!");
            }}
          />
        </div>
      ) : (
        <div style={{ maxWidth: "640px" }}>
          {/* Registration prerequisites */}
          {action === "register" && (
            <div style={{ marginBottom: "32px" }}>
              <div style={{ marginBottom: "24px" }}>
                <CleanverseVerification
                  walletAddress={agentAddress || "0x0000000000000000000000000000000000000000"}
                  onVerified={(score) => {
                    setCleanverseVerified(score >= 50);
                  }}
                />
              </div>
              <div>
                <PasskeyAuth onSuccess={() => setPasskeyRegistered(true)} />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="policy-form">
            <div className="form-group">
              <label htmlFor="agentAddress">Agent Address</label>
              <input
                type="text" id="agentAddress"
                value={agentAddress} onChange={e => setAgentAddress(e.target.value)}
                placeholder="0x..." required
              />
            </div>

            {action === "register" && (
              <div className="form-group">
                <label htmlFor="metadata">Agent Metadata (optional)</label>
                <input
                  type="text" id="metadata"
                  value={metadata} onChange={e => setMetadata(e.target.value)}
                  placeholder='{"name":"My Agent","description":"Trading bot"}'
                />
              </div>
            )}

            {action === "assign" && (
              <div className="form-group">
                <label htmlFor="policyId">Policy ID</label>
                <input
                  type="number" id="policyId"
                  value={policyId} onChange={e => setPolicyId(e.target.value)}
                  min="1" required
                />
              </div>
            )}

            {(action === "pause" || action === "unpause") && (
              <div className="warning-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#D97706" strokeWidth="2" fill="none" />
                </svg>
                <p>
                  {action === "pause"
                    ? "Pausing will immediately halt all agent transactions."
                    : "Unpausing will allow the agent to resume executing transactions."}
                </p>
              </div>
            )}

            {/* Toast handles errors */}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || (action === "register" && !cleanverseVerified)}
            >
              {loading ? "Processing..." : `${action.charAt(0).toUpperCase() + action.slice(1)} Agent`}
            </button>

            {action === "register" && !cleanverseVerified && (
              <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
                Cleanverse identity verification required before registration.
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
