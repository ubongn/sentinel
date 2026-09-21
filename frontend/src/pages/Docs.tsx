import { useState } from "react";

const DOCS = [
  {
    id: "overview",
    title: "Overview",
    content: `Sentinel is an on-chain guardrail system for AI agents on Monad. It allows users to define spending limits, whitelists, time-locks, and circuit breaks that are enforced by smart contracts — not by the agent's code.

The key insight: agents MUST call through Sentinel's guardrail contract to execute any transaction. If an agent tries to bypass Sentinel, the transaction reverts.`,
  },
  {
    id: "architecture",
    title: "Architecture",
    content: `Sentinel consists of three smart contracts:

1. **SentinelRegistry** — ERC-8004 compliant agent registry. Agents register on-chain with their guardrail policy hash attached. Any app can verify an agent's guardrails.

2. **SentinelGuard** — Core guardrail engine. All agent transactions route through this contract. It checks spending limits, whitelists, time-locks, and circuit breaks before execution.

3. **P256PolicyAuth** — Passkey-based policy authorization using Monad's native P256 precompile (EIP-7212). Users sign policy changes with WebAuthn passkeys instead of seed phrases.`,
  },
  {
    id: "integration",
    title: "Integration Guide",
    content: `To integrate Sentinel into your AI agent framework:

1. Register your agent on SentinelRegistry with a policy hash.
2. Create a guardrail policy via SentinelGuard.createPolicy().
3. Assign the policy to your agent via setPolicyForAgent().
4. Route all agent transactions through executeWithGuardrails().
5. Monitor activity via on-chain events.

Example (ethers.js):
\`\`\`
const guard = new ethers.Contract(GUARD_ADDRESS, SentinelGuardABI, signer);
await guard.executeWithGuardrails(
  agentAddress,
  targetContract,
  ethers.parseEther("0.1"),
  calldata
);
\`\`\``,
  },
  {
    id: "policies",
    title: "Policy Configuration",
    content: `A policy defines:

- **maxSpendPerTx** — Maximum wei per single transaction
- **maxSpendPerPeriod** — Maximum wei per time period
- **periodDuration** — Duration of the spending period in seconds
- **timeLockDuration** — Seconds to wait before large transactions execute
- **timeLockThreshold** — Transactions above this amount are time-locked
- **circuitBreakThreshold** — Auto-pause agent if a single transaction exceeds this
- **whitelist[]** — Approved contract addresses (empty = allow all)

All values are configurable per policy. Multiple agents can share the same policy.`,
  },
  {
    id: "timelocks",
    title: "Time-Locks",
    content: `When a transaction exceeds the time-lock threshold:

1. The transaction is queued via queueTimeLock().
2. A TimeLockQueued event is emitted with the executeAfter timestamp.
3. During the lock window, the policy owner can cancel via cancelTimeLock().
4. After the lock period, anyone can call executeTimeLock() to finalize.

This gives users a window to review large transactions before they execute.`,
  },
  {
    id: "circuit-break",
    title: "Circuit Breaks",
    content: `Circuit breaks provide emergency protection:

- **Auto circuit break**: If a transaction exceeds circuitBreakThreshold, the agent is automatically paused.
- **Manual pause**: The policy owner can pause an agent at any time via pauseAgent().
- **Unpause**: The policy owner can resume agent activity via unpauseAgent().

When paused, all executeWithGuardrails() calls for that agent revert immediately.`,
  },
  {
    id: "passkeys",
    title: "Passkey Authentication",
    content: `Sentinel uses Monad's native P256 precompile (EIP-7212) for passkey-based policy authorization:

1. Users register a WebAuthn passkey public key via P256PolicyAuth.registerPasskey().
2. When updating policies, users sign with their passkey.
3. The contract verifies the P256 signature using the Monad precompile at 0x0000000000000000000000000000000000000100.
4. No seed phrases needed for policy management.

This provides a Web2-like UX for non-crypto-native users while maintaining cryptographic security.`,
  },
];

export function Docs() {
  const [activeDoc, setActiveDoc] = useState("overview");

  const currentDoc = DOCS.find(d => d.id === activeDoc) || DOCS[0];

  return (
    <div className="page docs-page">
      <div className="page-header">
        <h1>Documentation</h1>
        <p>Developer docs for integrating Sentinel into your AI agent framework.</p>
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              className={`sidebar-link ${activeDoc === doc.id ? "active" : ""}`}
              onClick={() => setActiveDoc(doc.id)}
            >
              {doc.title}
            </button>
          ))}
        </aside>

        <main className="docs-content">
          <h2>{currentDoc.title}</h2>
          <div className="docs-text">
            {currentDoc.content.split("\n").map((line, i) => {
              if (line.startsWith("```")) return null;
              if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
              if (line.match(/^\d+\.\s/)) return <li key={i}>{line.replace(/^\d+\.\s/, "")}</li>;
              if (line.startsWith("**")) {
                const text = line.replace(/\*\*/g, "");
                return <p key={i}><strong>{text}</strong></p>;
              }
              if (line.trim() === "") return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
