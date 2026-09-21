import { useState, useEffect } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { MONAD_EXPLORER } from "../config/contracts";
import { ethers } from "ethers";

interface ActivityItem {
  type: string;
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
    const interval = setInterval(loadActivity, 15000); // refresh every 15s
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
        };
        if (ev.fragment?.name === "TransactionExecuted") {
          return {
            ...base,
            type: "Transaction Executed",
            agent: args[0],
            to: args[1],
            value: ethers.formatEther(args[2] || 0n),
          };
        }
        if (ev.fragment?.name === "AgentRegistered") {
          return {
            ...base,
            type: "Agent Registered",
            agent: args[0],
            owner: args[1],
          };
        }
        if (ev.fragment?.name === "AgentPaused") {
          return {
            ...base,
            type: "Agent Paused",
            agent: args[0],
            reason: args[1],
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

  function getEventIcon(type: string) {
    if (type.includes("Executed")) return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#10B981" strokeWidth="2" fill="none"/>
        <path d="M7 10l2 2 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    if (type.includes("Registered")) return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#6C5CE7" strokeWidth="2" fill="none"/>
        <path d="M10 6v8M6 10h8" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
    if (type.includes("Paused")) return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="2" fill="none"/>
        <path d="M8 7v6M12 7v6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#94A3B8" strokeWidth="2" fill="none"/>
      </svg>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Feed</h1>
        <p>Real-time feed of agent transactions being checked against guardrails.</p>
      </div>

      {loading ? (
        <div className="loading">Loading activity...</div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
            <path d="M24 16v8l4 2" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h3>No activity yet</h3>
          <p>Agent transactions will appear here as they are checked against guardrails.</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((item, i) => (
            <div key={`${item.txHash}-${i}`} className="activity-item">
              <div className="activity-icon">{getEventIcon(item.type)}</div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-type">{item.type}</span>
                  <span className="activity-time">{item.timestamp}</span>
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
                </div>
              </div>
              <a
                href={`${MONAD_EXPLORER}/tx/${item.txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="activity-link"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
