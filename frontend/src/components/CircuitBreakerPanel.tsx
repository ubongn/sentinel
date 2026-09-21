import { useState, useEffect, useCallback } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { ethers } from "ethers";

interface AutomationRule {
  id: string;
  name: string;
  agentAddress: string;
  checkInterval: number; // seconds
  maxSpendPerHour: number; // MON
  autoPause: boolean;
  active: boolean;
  lastCheck: number;
  lastSpend: number;
}

interface CircuitBreakerPanelProps {
  agents: { address: string; active: boolean }[];
}

export function CircuitBreakerPanel({ agents }: CircuitBreakerPanelProps) {
  const { pauseAgent, getRecentEvents } = useSentinel();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  // Automation engine — simulates Chainlink Keepers / Automation
  useEffect(() => {
    if (!monitoring || rules.length === 0) return;

    const interval = setInterval(async () => {
      for (const rule of rules.filter(r => r.active)) {
        try {
          // Check recent events for this agent
          const events = await getRecentEvents(-500);
          const now = Date.now() / 1000;
          const hourAgo = now - 3600;

          // Sum spending in the last hour for this agent
          let hourSpend = 0;
          for (const ev of events) {
            if (ev.fragment?.name === "TransactionExecuted" && ev.args) {
              const agent = ev.args[0];
              const value = ev.args[2];
              if (agent.toLowerCase() === rule.agentAddress.toLowerCase()) {
                const block = await ev.getBlock();
                if (block.timestamp >= hourAgo) {
                  hourSpend += parseFloat(ethers.formatEther(value));
                }
              }
            }
          }

          setRules(prev => prev.map(r =>
            r.id === rule.id
              ? { ...r, lastCheck: now, lastSpend: hourSpend }
              : r
          ));

          if (hourSpend > rule.maxSpendPerHour) {
            addLog(`ALERT: Agent ${rule.agentAddress.slice(0, 8)}... spent ${hourSpend.toFixed(2)} MON in 1h (limit: ${rule.maxSpendPerHour})`);
            if (rule.autoPause) {
              addLog(`AUTO-PAUSE: Pausing agent ${rule.agentAddress.slice(0, 8)}...`);
              await pauseAgent(rule.agentAddress);
              setRules(prev => prev.map(r =>
                r.id === rule.id ? { ...r, active: false } : r
              ));
            }
          } else {
            addLog(`OK: Agent ${rule.agentAddress.slice(0, 8)}... spend ${hourSpend.toFixed(2)} MON (limit: ${rule.maxSpendPerHour})`);
          }
        } catch (err: any) {
          addLog(`Error checking ${rule.agentAddress.slice(0, 8)}...: ${err.message?.slice(0, 80)}`);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [monitoring, rules, pauseAgent, getRecentEvents, addLog]);

  function addRule() {
    if (agents.length === 0) return;
    const rule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: `Rule ${rules.length + 1}`,
      agentAddress: agents[0].address,
      checkInterval: 60,
      maxSpendPerHour: 10,
      autoPause: true,
      active: true,
      lastCheck: 0,
      lastSpend: 0,
    };
    setRules(prev => [...prev, rule]);
  }

  function removeRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, active: !r.active } : r
    ));
  }

  return (
    <div className="circuit-breaker">
      <div className="cb-header">
        <div>
          <h2>Automation Monitor</h2>
          <p>Chainlink-style automated circuit breaker triggers. Monitors agent spending and auto-pauses when thresholds are exceeded.</p>
        </div>
        <div className="cb-controls">
          <button
            className={`btn btn-sm ${monitoring ? "btn-danger" : "btn-primary"}`}
            onClick={() => { setMonitoring(!monitoring); addLog(monitoring ? "Monitoring stopped" : "Monitoring started"); }}
          >
            {monitoring ? "Stop Monitoring" : "Start Monitoring"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={addRule}>
            Add Rule
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <h3>No automation rules</h3>
          <p>Add rules to monitor agent spending and auto-trigger circuit breaks.</p>
        </div>
      ) : (
        <div className="cb-rules">
          {rules.map(rule => (
            <div key={rule.id} className={`cb-rule ${!rule.active ? "cb-rule-inactive" : ""}`}>
              <div className="cb-rule-header">
                <div className="cb-rule-name">
                  <span className={`cb-dot ${rule.active ? "cb-dot-active" : ""}`} />
                  {rule.name}
                </div>
                <div className="cb-rule-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleRule(rule.id)}>
                    {rule.active ? "Pause" : "Resume"}
                  </button>
                  <button className="btn btn-sm" onClick={() => removeRule(rule.id)} style={{ color: "var(--red-500)" }}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="cb-rule-details">
                <div className="cb-field">
                  <span className="cb-label">Agent</span>
                  <span className="cb-value mono">{rule.agentAddress.slice(0, 10)}...{rule.agentAddress.slice(-6)}</span>
                </div>
                <div className="cb-field">
                  <span className="cb-label">Max/Hour</span>
                  <span className="cb-value">{rule.maxSpendPerHour} MON</span>
                </div>
                <div className="cb-field">
                  <span className="cb-label">Last Spend</span>
                  <span className="cb-value">{rule.lastSpend.toFixed(2)} MON</span>
                </div>
                <div className="cb-field">
                  <span className="cb-label">Auto-Pause</span>
                  <span className="cb-value">{rule.autoPause ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="cb-logs">
          <h3>Automation Log</h3>
          <div className="cb-log-entries">
            {logs.map((log, i) => (
              <div key={i} className={`cb-log-entry ${log.includes("ALERT") ? "cb-log-alert" : log.includes("Error") ? "cb-log-error" : ""}`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
