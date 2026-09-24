import { useState, useEffect } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { MONAD_EXPLORER } from "../config/contracts";
import { ethers } from "ethers";

interface ActivityItem {
  type: string;
  status: "passed" | "blocked" | "timelocked" | "info";
  txHash: string;
  blockNumber: number;
  agent?: string;
  to?: string;
  value?: string;
  owner?: string;
  reason?: string;
  timestamp: string;
}

export function ActivityFeed() {
  const { getRecentEvents } = useSentinel();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadActivity() {
    try {
      const events = await getRecentEvents(-2000);
      const items: ActivityItem[] = events.map((ev: any) => {
        const args = ev.args || [];
        const base = {
          txHash: ev.transactionHash,
          blockNumber: ev.blockNumber,
          timestamp: new Date().toISOString(),
          status: "info" as const,
        };
        if (ev.fragment?.name === "TransactionExecuted") {
          const value = ethers.formatEther(args[2] || 0n);
          return {
            ...base,
            type: "Transaction Executed",
            status: "passed" as const,
            agent: args[0],
            to: args[1],
            value,
          };
        }
        if (ev.fragment?.name === "TransactionBlocked") {
          return {
            ...base,
            type: "Transaction Blocked",
            status: "blocked" as const,
            agent: args[0],
            to: args[1],
            value: ethers.formatEther(args[2] || 0n),
            reason: args[3],
          };
        }
        if (ev.fragment?.name === "AgentRegistered") {
          return {
            ...base,
            type: "Agent Registered",
            status: "info" as const,
            agent: args[0],
            owner: args[1],
          };
        }
        if (ev.fragment?.name === "AgentPaused") {
          return {
            ...base,
            type: "Agent Paused",
            status: "blocked" as const,
            agent: args[0],
            reason: args[1],
          };
        }
        if (ev.fragment?.name === "TimeLockQueued") {
          return {
            ...base,
            type: "Time-Lock Queued",
            status: "timelocked" as const,
            agent: args[0],
          };
        }
        return { ...base, type: ev.fragment?.name || "Unknown" };
      });
      setActivities(items);
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setLoading(false);
    }
  }

  // Compute summary stats
  const totalChecked = activities.length;
  const blockedCount = activities.filter(a => a.status === "blocked").length;
  const passedCount = activities.filter(a => a.status === "passed").length;

  function getEventIcon(status: ActivityItem["status"]) {
    if (status === "passed") {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#22C55E" strokeWidth="2" fill="none" />
          <path d="M7 10l2 2 4-4" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (status === "blocked") {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="2" fill="none" />
          <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (status === "timelocked") {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#F59E0B" strokeWidth="2" fill="none" />
          <path d="M10 6v4l2.5 1.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#7C3AED" strokeWidth="2" fill="none" />
        <path d="M10 6v8M6 10h8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Feed</h1>
        <p>Real-time feed of agent transactions being checked against guardrails.</p>
      </div>

      {/* Protection Summary */}
      {!loading && totalChecked > 0 && (
        <div className="protection-summary">
          <span className="protection-summary-title">Protection Summary</span>
          <div className="protection-stat total">
            <span className="protection-stat-count">{totalChecked}</span>
            <span className="protection-stat-label">checked</span>
          </div>
          <div className="protection-stat blocked">
            <span className="protection-stat-count">{blockedCount}</span>
            <span className="protection-stat-label">blocked</span>
          </div>
          <div className="protection-stat passed">
            <span className="protection-stat-count">{passedCount}</span>
            <span className="protection-stat-label">passed</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="activity-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="activity-item">
              <div className="skeleton" style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0 }} />
              <div className="activity-content" style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                <div className="skeleton skeleton-text-sm" style={{ width: "70%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-list">
          {/* Demo data for showcase */}
          {[
            { type: "Transaction Blocked", status: "blocked" as const, agent: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", to: "0xdead000000000000000000000000000000000001", value: "50.0", reason: "SpendingLimitExceeded", time: "2 min ago" },
            { type: "Transaction Executed", status: "passed" as const, agent: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", to: "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575", value: "0.5", time: "5 min ago" },
            { type: "Transaction Blocked", status: "blocked" as const, agent: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", to: "0xbeef000000000000000000000000000000000002", value: "25.0", reason: "NotWhitelisted", time: "12 min ago" },
            { type: "Agent Registered", status: "info" as const, agent: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", owner: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", time: "1 hr ago" },
            { type: "Transaction Executed", status: "passed" as const, agent: "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96", to: "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d", value: "0.1", time: "1 hr ago" },
          ].map((item, i) => (
            <div key={i} className={`activity-item ${item.status === "blocked" ? "activity-blocked" : ""}`}>
              <div className="activity-icon">{getEventIcon(item.status)}</div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-type">{item.type}</span>
                  <span className="activity-time">{item.time}</span>
                </div>
                <div className="activity-details">
                  {item.agent && <span className="detail">Agent: <code>{item.agent.slice(0, 8)}...</code></span>}
                  {item.to && <span className="detail">To: <code>{item.to.slice(0, 8)}...</code></span>}
                  {item.value && <span className="detail">{item.value} MON</span>}
                  {"reason" in item && item.reason && <span className="detail reason">Reason: {item.reason}</span>}
                  <span className={`activity-status-badge ${item.status}`}>
                    {item.status === "passed" ? "Passed" : item.status === "blocked" ? "Blocked" : "Registered"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((item, i) => (
            <div key={`${item.txHash}-${i}`} className="activity-item">
              <div className="activity-icon">{getEventIcon(item.status)}</div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-type">{item.type}</span>
                  <span className="activity-time">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="activity-details">
                  {item.agent && (
                    <span className="detail">
                      Agent: <a href={`${MONAD_EXPLORER}/address/${item.agent}`} target="_blank" rel="noopener noreferrer">
                        {item.agent.slice(0, 8)}...
                      </a>
                    </span>
                  )}
                  {item.to && (
                    <span className="detail">
                      To: <a href={`${MONAD_EXPLORER}/address/${item.to}`} target="_blank" rel="noopener noreferrer">
                        {item.to.slice(0, 8)}...
                      </a>
                    </span>
                  )}
                  {item.value && <span className="detail">{item.value} MON</span>}
                  {item.status !== "info" && (
                    <span className={`activity-status-badge ${item.status}`}>
                      {item.status === "passed" ? "Passed" : item.status === "blocked" ? "Blocked" : "Time-Locked"}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`${MONAD_EXPLORER}/tx/${item.txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="activity-link"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
