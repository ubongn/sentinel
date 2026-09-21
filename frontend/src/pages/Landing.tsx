import { Link } from "react-router-dom";

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

export function Landing() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Monad Testnet</div>
          <h1>On-chain guardrails for AI agents</h1>
          <p className="hero-subtitle">
            Sentinel lets you define spending limits, whitelists, time-locks, and circuit breaks
            for AI agents — enforced by smart contracts on Monad. No bypass. No trust required.
          </p>
          <div className="hero-actions">
            <Link to="/create-policy" className="btn btn-primary btn-lg">Create Policy</Link>
            <Link to="/docs" className="btn btn-secondary btn-lg">Read Docs</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Guardrails that work</h2>
        <p className="section-subtitle">Every agent transaction is checked against your on-chain policy before execution.</p>
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

      {/* How it works */}
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

      {/* Monad Primitives */}
      <section className="primitives">
        <h2>Built on Monad Primitives</h2>
        <div className="primitives-grid">
          <div className="primitive-card">
            <h3>P256 Precompile</h3>
            <p>Passkey-based policy authorization via WebAuthn. No seed phrases needed for policy management.</p>
          </div>
          <div className="primitive-card">
            <h3>ERC-8004</h3>
            <p>Trustless agent registry. Each agent registers on-chain with guardrails attached. Any app can verify.</p>
          </div>
          <div className="primitive-card">
            <h3>10k TPS</h3>
            <p>Monad's parallel execution enables guardrail checks at scale. No latency tradeoff for safety.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Ready to add guardrails?</h2>
        <p>Define your first policy in under 2 minutes.</p>
        <Link to="/create-policy" className="btn btn-primary btn-lg">Get Started</Link>
      </section>
    </div>
  );
}
