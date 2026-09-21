import { useState, useEffect } from "react";
import { useSentinel, AgentInfo } from "../hooks/useSentinel";
import { MONAD_EXPLORER } from "../config/contracts";

export function Dashboard() {
  const { getAllAgents, getAgent, getAgentCount } = useSentinel();
  const [agents, setAgents] = useState<(AgentInfo & { address: string })[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const count = await getAgentCount();
      setTotalCount(Number(count));
      const addresses = await getAllAgents(0, 50);
      const infos = await Promise.all(
        addresses.map(async (addr: string) => {
          const info = await getAgent(addr);
          return { ...info, address: addr };
        })
      );
      setAgents(infos.filter(a => a.owner !== "0x0000000000000000000000000000000000000000"));
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>All registered agents and their guardrail policies on Monad Testnet.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Registered Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{agents.filter(a => a.active).length}</div>
          <div className="stat-label">Active Agents</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
            <path d="M18 24h12M24 18v12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h3>No agents registered yet</h3>
          <p>Register your first AI agent to start using Sentinel guardrails.</p>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map(agent => (
            <div key={agent.address} className="agent-card">
              <div className="agent-card-header">
                <div className="agent-address">
                  <a href={`${MONAD_EXPLORER}/address/${agent.address}`} target="_blank" rel="noopener noreferrer">
                    {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                  </a>
                </div>
                <span className={`status-badge ${agent.active ? "active" : "inactive"}`}>
                  {agent.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="agent-card-body">
                <div className="agent-field">
                  <span className="field-label">Owner</span>
                  <span className="field-value">{agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}</span>
                </div>
                <div className="agent-field">
                  <span className="field-label">Policy Hash</span>
                  <span className="field-value mono">{agent.policyHash.slice(0, 18)}...</span>
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
      )}
    </div>
  );
}
