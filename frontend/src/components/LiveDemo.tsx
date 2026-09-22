import { useState, useEffect, useCallback } from "react";

interface DemoStep {
  id: number;
  agentAction: string;
  checkType: string;
  contractAddress: string;
  result: "passed" | "blocked" | "circuit-break";
  resultLabel: string;
  detail: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    agentAction: "AI agent wants to send 5 MON to an unknown address",
    checkType: "SPENDING LIMIT",
    contractAddress: "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575",
    result: "blocked",
    resultLabel: "BLOCKED",
    detail: "Policy limit: 1 MON per transaction. Requested: 5 MON.",
  },
  {
    id: 2,
    agentAction: "Agent retries: 0.5 MON to whitelisted DEX contract",
    checkType: "WHITELIST + LIMITS",
    contractAddress: "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575",
    result: "passed",
    resultLabel: "PASSED",
    detail: "0.5 MON within limit. Recipient is whitelisted.",
  },
  {
    id: 3,
    agentAction: "Agent attempts: 20 MON to drain wallet",
    checkType: "CIRCUIT BREAK",
    contractAddress: "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575",
    result: "circuit-break",
    resultLabel: "CIRCUIT BREAK TRIGGERED",
    detail: "Exceeds circuit break threshold. Agent paused automatically.",
  },
];

function ResultIcon({ result }: { result: DemoStep["result"] }) {
  if (result === "passed") {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#22C55E" strokeWidth="2" fill="none" />
        <path d="M9 14l3.5 3.5 6.5-7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (result === "blocked") {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#EF4444" strokeWidth="2" fill="none" />
        <path d="M10 10l8 8M18 10l-8 8" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  // circuit-break
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" stroke="#D97706" strokeWidth="2" fill="none" />
      <rect x="11" y="9" width="6" height="10" rx="1" stroke="#D97706" strokeWidth="2" fill="none" />
      <line x1="13" y1="12" x2="15" y2="12" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 9.5l4 4 8-9" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LiveDemo() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [animating, setAnimating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const startDemo = useCallback(() => {
    setVisibleSteps([]);
    setAnimating(true);
    setCompleted(false);

    DEMO_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step.id]);
        if (index === DEMO_STEPS.length - 1) {
          setTimeout(() => {
            setAnimating(false);
            setCompleted(true);
          }, 600);
        }
      }, (index + 1) * 1200);
    });
  }, []);

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(startDemo, 800);
    return () => clearTimeout(timer);
  }, [startDemo]);

  return (
    <div className="live-demo">
      <div className="live-demo-header">
        <div className="live-demo-badge">
          <span className="live-demo-dot" />
          Live Guardrail Demo
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={startDemo}
          disabled={animating}
        >
          {animating ? "Running..." : "Replay Demo"}
        </button>
      </div>

      <div className="live-demo-timeline">
        {DEMO_STEPS.map((step) => {
          const visible = visibleSteps.includes(step.id);
          return (
            <div
              key={step.id}
              className={`demo-step ${visible ? "demo-step-visible" : ""} ${
                step.result === "passed" ? "demo-step-passed" :
                step.result === "blocked" ? "demo-step-blocked" :
                "demo-step-circuit"
              }`}
            >
              <div className="demo-step-left">
                <div className={`demo-step-indicator ${
                  step.result === "passed" ? "indicator-passed" :
                  step.result === "blocked" ? "indicator-blocked" :
                  "indicator-circuit"
                }`}>
                  {step.result === "passed" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : step.result === "blocked" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 4l6 6M10 4l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="3" width="6" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="demo-step-body">
                <div className="demo-step-action">{step.agentAction}</div>

                <div className="demo-step-check">
                  <div className="demo-check-row">
                    <CheckIcon />
                    <span className="demo-check-label">{step.checkType}</span>
                    <span className="demo-check-contract">
                      <a
                        href={`https://monad-testnet.socialscan.io/address/${step.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {step.contractAddress.slice(0, 10)}...{step.contractAddress.slice(-6)}
                      </a>
                    </span>
                  </div>

                  <div className={`demo-result demo-result-${step.result}`}>
                    <ResultIcon result={step.result} />
                    <div>
                      <div className="demo-result-label">{step.resultLabel}</div>
                      <div className="demo-result-detail">{step.detail}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {completed && (
        <div className="live-demo-summary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1z" stroke="#7C3AED" strokeWidth="1.5" fill="none" />
            <path d="M8 4v4l2.5 1.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>All checks executed on-chain via SentinelGuard contract. No off-chain bypass possible.</span>
        </div>
      )}
    </div>
  );
}
