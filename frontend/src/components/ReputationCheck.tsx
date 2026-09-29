import { useState } from "react";

interface ReputationCheckProps {
  walletAddress: string;
  onChecked?: (result: { rated: number; farmed: number }) => void;
}

interface RatedAgent {
  agentId: number;
  verdict: string;
  why: string;
}

const API = "https://prooflines.org/monad/agent-trust/api";

/** Verdicts that mean the rating count was produced by the owner rather than earned. */
const SELF_PRODUCED = new Set(["farmed", "single-source", "burst"]);

/**
 * ERC-8004 reputation provenance for the agent's owner address.
 *
 * Sentinel already asks who an agent is before it registers one. This asks a different question
 * about the same address: if it owns agents that carry ratings, were those ratings paid for by
 * somebody other than the owner? On Monad today most are not, so an agent arriving with a large
 * rating count is not evidence of anything by itself.
 *
 * Read-only and free: no key, no wallet, no payment. The paid half of that service is not touched
 * from here, which is why the request carries `buy=0`.
 */
export function ReputationCheck({ walletAddress, onChecked }: ReputationCheckProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "failed">("idle");
  const [agents, setAgents] = useState<RatedAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const valid = /^0x[0-9a-fA-F]{40}$/.test(walletAddress);

  async function check() {
    setStatus("checking");
    setError(null);
    try {
      const res = await fetch(`${API}/wallet/${walletAddress}?buy=0`);
      if (!res.ok) throw new Error(`reputation service answered ${res.status}`);
      const data = await res.json();
      const rated: RatedAgent[] = data.ownsRatedAgents ?? [];
      setAgents(rated);
      setStatus("done");
      onChecked?.({
        rated: rated.length,
        farmed: rated.filter(a => SELF_PRODUCED.has(a.verdict)).length,
      });
    } catch (err) {
      // A check that cannot run is not a pass and not a fail: it is unknown, and the registration
      // flow should keep going rather than block on someone else's uptime.
      setError(err instanceof Error ? err.message : "reputation service unreachable");
      setStatus("failed");
    }
  }

  return (
    <div className="form-group">
      <label>ERC-8004 Reputation Provenance</label>
      <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: 12 }}>
        Checks whether agents owned by this address carry ratings that somebody other than the
        owner paid for. Free, read-only, no key.
      </p>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={check}
        disabled={!valid || status === "checking"}
      >
        {status === "checking" ? "Checking…" : "Check reputation"}
      </button>

      {!valid && (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: 8 }}>
          Enter the agent address above first.
        </p>
      )}

      {status === "done" && agents.length === 0 && (
        <p style={{ fontSize: "13px", marginTop: 12 }}>
          No rated agents under this address. That is the normal case: 84 of 10,260 registered
          agents have ever been rated, so there is nothing to judge here either way.
        </p>
      )}

      {status === "done" && agents.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {agents.map(a => (
            <div key={a.agentId} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: "13px" }}>
                Agent #{a.agentId}: {a.verdict}
              </strong>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "4px 0 0" }}>{a.why}</p>
            </div>
          ))}
          <a
            href={`https://prooflines.org/monad/agent-trust/`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "12px" }}
          >
            Full provenance report
          </a>
        </div>
      )}

      {status === "failed" && (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: 12 }}>
          Could not check right now ({error}). Registration is not blocked by this.
        </p>
      )}
    </div>
  );
}
