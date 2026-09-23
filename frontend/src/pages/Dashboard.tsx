import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useSentinel } from "../hooks/useSentinel";
import { MONAD_EXPLORER, getDelegationTarget, CONTRACTS } from "../config/contracts";
import { CircuitBreakerPanel } from "../components/CircuitBreakerPanel";

interface AgentInfo {
  owner: string;
  policyHash: string;
  registeredAt: bigint;
  updatedAt: bigint;
  active: boolean;
  metadata: string;
  smartAccountActive?: boolean; // EIP-7702 status
}

export function Dashboard() {
  const { getAllAgents, getAgent, getAgentCount, getRecentEvents } = useSentinel();
  const [agents, setAgents] = useState<(AgentInfo & { address: string })[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"agents" | "automation">("agents");
  const [protectedTxs, setProtectedTxs] = useState(0);
  const [valueSecured, setValueSecured] = useState("0");

  useEffect(() => {
    loadAgents();
    loadStats();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const count = await getAgentCount();
      setTotalCount(Number(count));
      const addresses = await getAllAgents(0, 50);
      const infos = await Promise.all(
        addresses.map(async (addr: string) => {
          try {
            const [info, delegationTarget] = await Promise.all([
              getAgent(addr),
              getDelegationTarget(addr).catch(() => ethers.ZeroAddress),
            ]);
            const smartAccountActive =
              CONTRACTS.SentinelAccount !== "0x0000000000000000000000000000000000000000" &&
              delegationTarget.toLowerCase() === CONTRACTS.SentinelAccount.toLowerCase();
            return {
              owner: info.owner || "",
              policyHash: info.policyHash || "",
              registeredAt: info.registeredAt || 0n,
              updatedAt: info.updatedAt || 0n,
              active: info.active ?? false,
              metadata: info.metadata || "",
              address: addr,
              smartAccountActive,
            };
          } catch {
            return null;
          }
        })
      );
      setAgents(infos.filter((a): a is NonNullable<typeof a> => a !== null && a.owner !== "0x0000000000000000000000000000000000000000"));
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const events = await getRecentEvents(-5000);
      let totalChecked = 0;
      let totalValue = 0n;
      for (const ev of events) {
        const evAny = ev as any;
        if (evAny.fragment?.name === "TransactionExecuted") {
          totalChecked++;
          const args = evAny.args || [];
          totalValue += (args[2] || 0n) as bigint;
        }
      }
      setProtectedTxs(totalChecked);
      setValueSecured(parseFloat(ethers.formatEther(totalValue)).toFixed(2));
    } catch {
      // Stats are non-critical
    }
  }

  function renderSkeletonCards() {
    return Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="agent-card">
        <div className="agent-card-header">
          <div className="skeleton" style={{ width: 120, height: 16 }} />
          <div className="skeleton" style={{ width: 56, height: 20, borderRadius: 100 }} />
        </div>
        <div className="agent-card-body">
          <div className="agent-field">
            <div className="skeleton" style={{ width: 48, height: 14 }} />
            <div className="skeleton" style={{ width: 80, height: 14 }} />
          </div>
          <div className="agent-field">
            <div className="skeleton" style={{ width: 72, height: 14 }} />
            <div className="skeleton" style={{ width: 120, height: 14 }} />
          </div>
        </div>
      </div>
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>All registered agents and their guardrail policies on Monad Testnet.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{loading ? <div className="skeleton skeleton-stat" /> : totalCount}</div>
          <div className="stat-label">Registered Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? <div className="skeleton skeleton-stat" /> : agents.filter(a => a.active).length}</div>
          <div className="stat-label">Active Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? <div className="skeleton skeleton-stat" /> : protectedTxs}</div>
          <div className="stat-label">Transactions Protected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? <div className="skeleton skeleton-stat" /> : `${valueSecured} MON`}</div>
          <div className="stat-label">Total Value Secured</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#22C55E" }}>
            {loading ? <div className="skeleton skeleton-stat" /> : agents.filter(a => a.smartAccountActive).length}
          </div>
          <div className="stat-label">No-Bypass (7702)</div>
        </div>
      </div>

      <div className="action-tabs" style={{ marginBottom: "24px" }}>
        <button className={`tab ${tab === "agents" ? "active" : ""}`} onClick={() => setTab("agents")}>
          Agents
        </button>
        <button className={`tab ${tab === "automation" ? "active" : ""}`} onClick={() => setTab("automation")}>
          Automation
        </button>
      </div>

      {tab === "agents" ? (
        loading ? (
          <div className="agent-grid">{renderSkeletonCards()}</div>
        ) : agents.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#D4D4D8" strokeWidth="2" fill="none" />
              <path d="M18 24h12M24 18v12" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h3>No agents registered yet</h3>
            <p>Register your first AI agent to start using Sentinel guardrails.</p>
          </div>
        ) : (
          <div className="agent-grid">
            {agents.map(agent => (
              <div key={agent.address} className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-address" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`agent-status-dot ${agent.active ? "active" : "paused"}`} />
                    <a href={`${MONAD_EXPLORER}/address/${agent.address}`} target="_blank" rel="noopener noreferrer">
                      {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {/* EIP-7702 Smart Account badge */}
                    {agent.smartAccountActive ? (
                      <span className="status-badge" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", fontSize: "11px", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1L2 3v3c0 2.5 1.7 5 4 5.5 2.3-.5 4-3 4-5.5V3L6 1z" fill="#22C55E" stroke="#16A34A" strokeWidth="0.8"/>
                          <path d="M4.5 6l1 1 2.5-2.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        No-Bypass
                      </span>
                    ) : (
                      <span className="status-badge" style={{ background: "rgba(217,119,6,0.15)", color: "#D97706", fontSize: "11px", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1L2 3v3c0 2.5 1.7 5 4 5.5 2.3-.5 4-3 4-5.5V3L6 1z" stroke="#D97706" strokeWidth="0.8" fill="none"/>
                          <path d="M6 4.5v2M6 8h.01" stroke="#D97706" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                        Opt-in
                      </span>
                    )}
                    <span className={`status-badge ${agent.active ? "active" : "inactive"}`}>
                      {agent.active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <div className="agent-card-body">
                  <div className="agent-field">
                    <span className="field-label">Owner</span>
                    <span className="field-value">{agent.owner ? `${agent.owner.slice(0, 6)}...${agent.owner.slice(-4)}` : "---"}</span>
                  </div>
                  <div className="agent-field">
                    <span className="field-label">Policy Hash</span>
                    <span className="field-value mono">{agent.policyHash ? `${agent.policyHash.slice(0, 18)}...` : "---"}</span>
                  </div>
                  <div className="agent-field">
                    <span className="field-label">Guardrail Mode</span>
                    <span className="field-value" style={{ color: agent.smartAccountActive ? "#22C55E" : "#D97706" }}>
                      {agent.smartAccountActive ? "EIP-7702 Smart Account" : "Opt-in (bypassable)"}
                    </span>
                  </div>
                  {agent.metadata && (
                    <div className="agent-field">
                      <span className="field-label">Metadata</span>
                      <span className="field-value">{agent.metadata}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <CircuitBreakerPanel agents={agents.map(a => ({ address: a.address, active: a.active }))} />
      )}
    </div>
  );
}
