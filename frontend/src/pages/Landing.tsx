import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { LiveDemo } from "../components/LiveDemo";
import { CONTRACTS } from "../config/contracts";

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Spending Limits",
    desc: "Set max MON per transaction or per time period. Agents cannot exceed your configured thresholds.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Address Whitelists",
    desc: "Agents can only interact with approved contract addresses. Everything else is blocked at the contract level.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Time-Locks",
    desc: "Large transactions are delayed with a configurable lock period. Cancel before execution if something looks wrong.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "Circuit Breaks",
    desc: "Emergency pause all agent activity instantly. Auto-trigger when spending exceeds your configured threshold.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Create Policy", desc: "Define spending limits, whitelists, time-locks, and circuit break thresholds." },
  { step: "2", title: "Register Agent", desc: "Register your AI agent on-chain with its guardrail policy attached (ERC-8004)." },
  { step: "3", title: "Agent Executes", desc: "All transactions route through Sentinel's guardrail contract. No bypass possible." },
  { step: "4", title: "Monitor & Control", desc: "Real-time activity feed. Pause or adjust guardrails at any time." },
];

const PRIMITIVES = [
  {
    tag: "P256 Precompile",
    title: "Passkey Auth",
    desc: "WebAuthn passkey authorization via Monad's native P256 precompile (EIP-7212). No seed phrases needed.",
  },
  {
    tag: "ERC-8004",
    title: "Trustless Agent Registry",
    desc: "On-chain agent registration with guardrail policy hash. Any app can verify an agent's safety guarantees.",
  },
  {
    tag: "10,000 TPS",
    title: "Parallel Execution",
    desc: "Monad's parallel execution enables guardrail checks at scale with zero latency tradeoff for safety.",
  },
];

export function Landing() {
  const { getAgentCount } = useSentinel();
  const [agentCount, setAgentCount] = useState<string>("--");
  const [contractCount] = useState("3");

  useEffect(() => {
    getAgentCount()
      .then(count => setAgentCount(count.toString()))
      .catch(() => setAgentCount("0"));
  }, [getAgentCount]);

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Monad Testnet</div>
          <h1>
            AI agents can drain wallets.
            <br />
            <span className="hero-highlight">Sentinel stops them.</span>
          </h1>
          <p className="hero-subtitle">
            On-chain guardrails for autonomous AI agents: spending limits, whitelists,
            time-locks, and circuit breaks. Enforced by smart contracts on Monad.
            No bypass. No trust required.
          </p>
          <div className="hero-actions">
            <Link to="/create-policy" className="btn btn-primary btn-lg">
              Try It on Monad Testnet
            </Link>
            <Link to="/docs" className="btn btn-secondary btn-lg">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem Statement ── */}
      <section className="problem-statement">
        <div className="problem-grid">
          <div className="problem-card problem-card-danger">
            <div className="problem-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L2 28h28L16 4z" stroke="#EF4444" strokeWidth="2" fill="none" />
                <line x1="16" y1="12" x2="16" y2="19" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="16" cy="23" r="1.5" fill="#EF4444" />
              </svg>
            </div>
            <h3>The Problem</h3>
            <p>
              Autonomous AI agents can execute transactions on behalf of users.
              Without guardrails, a compromised or misaligned agent can drain
              an entire wallet in a single transaction.
            </p>
          </div>
          <div className="problem-card problem-card-solution">
            <div className="problem-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 4s10 4 10 14v6l-10 4-10-4v-6c0-10 10-14 10-14z" stroke="#22C55E" strokeWidth="2" fill="none" />
                <path d="M12 17l3 3 5-6" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>The Solution</h3>
            <p>
              Sentinel enforces safety at the smart contract level. Every agent
              transaction is validated against an on-chain policy before execution.
              Spending limits, whitelists, time-locks, circuit breaks.
              All enforced on-chain. Not by the agent.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live Demo ── */}
      <section className="demo-section">
        <div className="demo-section-header">
          <h2>See It In Action</h2>
          <p className="section-subtitle">
            Watch how Sentinel's guardrail contract validates every agent transaction on-chain.
          </p>
        </div>
        <LiveDemo />
      </section>

      {/* ── Live Stats ── */}
      <section className="live-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{contractCount}</div>
            <div className="stat-description">Contracts Deployed</div>
            <div className="stat-detail">on Monad Testnet</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">{agentCount}</div>
            <div className="stat-description">Agents Registered</div>
            <div className="stat-detail">ERC-8004 compliant</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">5</div>
            <div className="stat-description">Bounty Integrations</div>
            <div className="stat-detail">Dynamic, Mera, Chainlink, Qwen, Cleanverse</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-description">On-Chain Enforcement</div>
            <div className="stat-detail">Zero off-chain trust</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <h2>Four guardrails. Total control.</h2>
        <p className="section-subtitle">
          Every agent transaction is checked against your on-chain policy before execution.
        </p>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-it-works">
        <h2>How it works</h2>
        <div className="steps">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="step">
              <div className="step-number">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Monad Primitives ── */}
      <section className="primitives">
        <h2>Built on Monad Primitives</h2>
        <p className="section-subtitle">
          Sentinel leverages Monad's unique features for performance and UX.
        </p>
        <div className="primitives-grid">
          {PRIMITIVES.map((p) => (
            <div key={p.tag} className="primitive-card">
              <div className="primitive-tag">{p.tag}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contract Addresses ── */}
      <section className="contracts-section">
        <h2>Deployed Contracts</h2>
        <p className="section-subtitle">Live on Monad Testnet (Chain ID: 10143)</p>
        <div className="contracts-grid">
          {Object.entries(CONTRACTS).map(([name, address]) => (
            <a
              key={name}
              href={`https://monad-testnet.socialscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-card"
            >
              <div className="contract-name">{name}</div>
              <div className="contract-address">{address}</div>
            </a>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta">
        <h2>Ready to add guardrails?</h2>
        <p>Define your first policy in under 2 minutes. No seed phrases needed.</p>
        <Link to="/create-policy" className="btn btn-primary btn-lg">Get Started</Link>
      </section>
    </div>
  );
}
