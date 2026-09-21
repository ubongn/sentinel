import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" stroke="#6C5CE7" strokeWidth="2" fill="none"/>
        <path d="M10 16h12M16 10v12" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Spending Limits",
    desc: "Set max MON per transaction or per time period. Agents cannot exceed your configured thresholds.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="#6C5CE7" strokeWidth="2" fill="none"/>
        <path d="M11 16l3 3 7-7" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Address Whitelists",
    desc: "Agents can only interact with approved contract addresses. Everything else is blocked at the contract level.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="#6C5CE7" strokeWidth="2" fill="none"/>
        <path d="M16 10v6l4 2" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Time-Locks",
    desc: "Large transactions are delayed with a configurable lock period. Cancel before execution if something looks wrong.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="4" width="20" height="24" rx="3" stroke="#6C5CE7" strokeWidth="2" fill="none"/>
        <path d="M12 14h8M12 18h8M12 22h5" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Circuit Breaks",
    desc: "Emergency pause all agent activity instantly. One transaction to halt everything.",
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
            <Link to="/create-policy" className="btn btn-primary">Create Policy</Link>
            <Link to="/docs" className="btn btn-secondary">Read Docs</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Guardrails that work</h2>
        <p className="section-subtitle">Every agent transaction is checked against your on-chain policy before execution.</p>
        <div className="features-grid">
          {FEATURES.map(f => (
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
          {HOW_IT_WORKS.map(s => (
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
            <h3>BTX Encrypted Mempools</h3>
            <p>Spending limits and whitelists stay private until execution. Guardrail config is never publicly exposed.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Ready to add guardrails?</h2>
        <p>Define your first policy in under 2 minutes.</p>
        <Link to="/create-policy" className="btn btn-primary">Get Started</Link>
      </section>
    </div>
  );
}
