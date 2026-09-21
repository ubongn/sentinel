import { useState } from "react";
import { useSentinel } from "../hooks/useSentinel";
import { AiAssistant } from "../components/AiAssistant";

export function CreatePolicy() {
  const { createPolicy, loading, error } = useSentinel();
  const [showAi, setShowAi] = useState(false);
  const [form, setForm] = useState({
    maxSpendPerTx: "1",
    maxSpendPerPeriod: "10",
    periodDuration: "86400",
    timeLockDuration: "3600",
    timeLockThreshold: "5",
    circuitBreakThreshold: "100",
    whitelist: "",
  });
  const [result, setResult] = useState<{ txHash: string; policyId: bigint } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleAiPolicy(policy: {
    maxSpendPerTx: string;
    maxSpendPerPeriod: string;
    periodDuration: string;
    timeLockDuration: string;
    timeLockThreshold: string;
    circuitBreakThreshold: string;
    whitelist: string[];
  }) {
    setForm({
      maxSpendPerTx: policy.maxSpendPerTx,
      maxSpendPerPeriod: policy.maxSpendPerPeriod,
      periodDuration: policy.periodDuration,
      timeLockDuration: policy.timeLockDuration,
      timeLockThreshold: policy.timeLockThreshold,
      circuitBreakThreshold: policy.circuitBreakThreshold,
      whitelist: policy.whitelist.join("\n"),
    });
    setShowAi(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const whitelist = form.whitelist
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith("0x"));
    try {
      const res = await createPolicy(
        form.maxSpendPerTx,
        form.maxSpendPerPeriod,
        parseInt(form.periodDuration),
        parseInt(form.timeLockDuration),
        form.timeLockThreshold,
        form.circuitBreakThreshold,
        whitelist
      );
      setResult(res);
    } catch { /* error shown via hook */ }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Create Guardrail Policy</h1>
        <p>Define the rules your AI agent must follow. All enforcement happens on-chain.</p>
      </div>

      {result ? (
        <div className="success-card">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#22C55E" strokeWidth="2" fill="none" />
            <path d="M16 24l5 5 11-11" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2>Policy Created</h2>
          <p>Policy ID: <strong>{result.policyId.toString()}</strong></p>
          <p className="mono" style={{ fontSize: "12px", wordBreak: "break-all" }}>{result.txHash}</p>
          <button className="btn btn-secondary" style={{ marginTop: "16px" }} onClick={() => setResult(null)}>Create Another</button>
        </div>
      ) : (
        <>
          {/* AI Assistant Toggle */}
          <div style={{ marginBottom: "24px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAi(!showAi)}
              style={{ marginBottom: "16px" }}
            >
              {showAi ? "Manual Configuration" : "Use AI Assistant"}
            </button>

            {showAi && <AiAssistant onPolicyGenerated={handleAiPolicy} />}
          </div>

          <form onSubmit={handleSubmit} className="policy-form">
            <div className="form-section">
              <h2>Spending Limits</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="maxSpendPerTx">Max per Transaction (MON)</label>
                  <input
                    type="number" id="maxSpendPerTx" name="maxSpendPerTx"
                    value={form.maxSpendPerTx} onChange={handleChange}
                    step="0.01" min="0" required
                  />
                  <span className="form-hint">Maximum amount in a single transaction</span>
                </div>
                <div className="form-group">
                  <label htmlFor="maxSpendPerPeriod">Max per Period (MON)</label>
                  <input
                    type="number" id="maxSpendPerPeriod" name="maxSpendPerPeriod"
                    value={form.maxSpendPerPeriod} onChange={handleChange}
                    step="0.01" min="0" required
                  />
                  <span className="form-hint">Maximum amount within the time period</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="periodDuration">Period Duration (seconds)</label>
                <input
                  type="number" id="periodDuration" name="periodDuration"
                  value={form.periodDuration} onChange={handleChange}
                  min="0" required
                />
                <span className="form-hint">86400 = 1 day, 3600 = 1 hour</span>
              </div>
            </div>

            <div className="form-section">
              <h2>Time-Lock</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeLockDuration">Lock Duration (seconds)</label>
                  <input
                    type="number" id="timeLockDuration" name="timeLockDuration"
                    value={form.timeLockDuration} onChange={handleChange}
                    min="0" required
                  />
                  <span className="form-hint">Delay before large transactions execute</span>
                </div>
                <div className="form-group">
                  <label htmlFor="timeLockThreshold">Lock Threshold (MON)</label>
                  <input
                    type="number" id="timeLockThreshold" name="timeLockThreshold"
                    value={form.timeLockThreshold} onChange={handleChange}
                    step="0.01" min="0" required
                  />
                  <span className="form-hint">Transactions above this amount are time-locked</span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Circuit Break</h2>
              <div className="form-group">
                <label htmlFor="circuitBreakThreshold">Circuit Break Threshold (MON)</label>
                <input
                  type="number" id="circuitBreakThreshold" name="circuitBreakThreshold"
                  value={form.circuitBreakThreshold} onChange={handleChange}
                  step="0.01" min="0" required
                />
                <span className="form-hint">Auto-pause agent if a single transaction exceeds this</span>
              </div>
            </div>

            <div className="form-section">
              <h2>Whitelist</h2>
              <div className="form-group">
                <label htmlFor="whitelist">Approved Addresses (one per line or comma-separated)</label>
                <textarea
                  id="whitelist" name="whitelist"
                  value={form.whitelist} onChange={handleChange}
                  rows={4} placeholder="0x..."
                />
                <span className="form-hint">Leave empty to allow all addresses</span>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Creating..." : "Create Policy"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
