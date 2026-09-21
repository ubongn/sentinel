import { useState, useRef, useEffect } from "react";

interface PolicyParams {
  maxSpendPerTx: string;
  maxSpendPerPeriod: string;
  periodDuration: string;
  timeLockDuration: string;
  timeLockThreshold: string;
  circuitBreakThreshold: string;
  whitelist: string[];
}

interface AiAssistantProps {
  onPolicyGenerated: (policy: PolicyParams) => void;
}

const SUGGESTIONS = [
  "Limit my agent to 1 MON per transaction, whitelist only Uniswap",
  "Allow 10 MON per day, time-lock anything over 5 MON for 1 hour",
  "Strict mode: 0.5 MON per tx, 5 MON daily, auto-pause at 2 MON",
];

export function AiAssistant({ onPolicyGenerated }: AiAssistantProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  function parsePolicy(text: string): PolicyParams {
    const defaults: PolicyParams = {
      maxSpendPerTx: "1",
      maxSpendPerPeriod: "10",
      periodDuration: "86400",
      timeLockDuration: "3600",
      timeLockThreshold: "5",
      circuitBreakThreshold: "50",
      whitelist: [],
    };

    // Extract MON amounts from natural language
    const perTxMatch = text.match(/(\d+(?:\.\d+)?)\s*MON\s*per\s*(?:transaction|tx)/i);
    if (perTxMatch) defaults.maxSpendPerTx = perTxMatch[1];

    const perPeriodMatch = text.match(/(\d+(?:\.\d+)?)\s*MON\s*(?:per\s*(?:day|period|hour)|daily)/i);
    if (perPeriodMatch) defaults.maxSpendPerPeriod = perPeriodMatch[1];

    const timeLockMatch = text.match(/(?:time-?lock|delay)\s*(?:anything\s*)?(?:over|above|exceeding)\s*(\d+(?:\.\d+)?)\s*MON/i);
    if (timeLockMatch) defaults.timeLockThreshold = timeLockMatch[1];

    const lockDurationMatch = text.match(/(\d+)\s*(?:hour|hr)/i);
    if (lockDurationMatch) defaults.timeLockDuration = String(parseInt(lockDurationMatch[1]) * 3600);

    const circuitMatch = text.match(/(?:auto-?pause|circuit\s*break)\s*(?:at|threshold)\s*(\d+(?:\.\d+)?)\s*MON/i);
    if (circuitMatch) defaults.circuitBreakThreshold = circuitMatch[1];

    // Strict mode
    if (text.toLowerCase().includes("strict")) {
      defaults.maxSpendPerTx = "0.5";
      defaults.maxSpendPerPeriod = "5";
      defaults.timeLockThreshold = "2";
      defaults.timeLockDuration = "7200";
    }

    // Whitelist extraction
    const whitelistMatch = text.match(/whitelist\s+(?:only\s+)?(.+?)(?:\.|$)/i);
    if (whitelistMatch) {
      const names = whitelistMatch[1].split(/,|\band\b/).map(s => s.trim()).filter(Boolean);
      defaults.whitelist = names;
    }

    return defaults;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    setLoading(true);

    // Try Qwen API first, fall back to local parsing
    const apiKey = import.meta.env.VITE_QWEN_API_KEY;
    let response: string;
    let policy: PolicyParams;

    if (apiKey) {
      try {
        const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "qwen-max",
            messages: [
              {
                role: "system",
                content: `You are a policy configuration assistant for Sentinel, an on-chain guardrail system for AI agents on Monad blockchain.
The user will describe guardrails in natural language. Parse their intent into policy parameters.
Respond ONLY with valid JSON matching this schema:
{
  "maxSpendPerTx": "<number in MON>",
  "maxSpendPerPeriod": "<number in MON>",
  "periodDuration": "<seconds>",
  "timeLockDuration": "<seconds>",
  "timeLockThreshold": "<number in MON>",
  "circuitBreakThreshold": "<number in MON>",
  "whitelist": ["<contract names or addresses>"],
  "explanation": "<brief explanation of what was configured>"
}
Default values: 1 MON per tx, 10 MON per day (86400s), 1-hour time-lock at 5 MON, circuit break at 50 MON.
If user says "strict", use 0.5/tx, 5/day, time-lock at 2 MON for 2 hours.`,
              },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
          }),
        });
        const data = await res.json();
        const aiContent = data.choices?.[0]?.message?.content || "";
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          policy = {
            maxSpendPerTx: parsed.maxSpendPerTx || "1",
            maxSpendPerPeriod: parsed.maxSpendPerPeriod || "10",
            periodDuration: parsed.periodDuration || "86400",
            timeLockDuration: parsed.timeLockDuration || "3600",
            timeLockThreshold: parsed.timeLockThreshold || "5",
            circuitBreakThreshold: parsed.circuitBreakThreshold || "50",
            whitelist: parsed.whitelist || [],
          };
          response = parsed.explanation || "Policy configured based on your description.";
        } else {
          policy = parsePolicy(userMsg);
          response = `Parsed locally. Set: ${policy.maxSpendPerTx} MON/tx, ${policy.maxSpendPerPeriod} MON/day, time-lock at ${policy.timeLockThreshold} MON.`;
        }
      } catch {
        policy = parsePolicy(userMsg);
        response = `API unavailable. Parsed locally: ${policy.maxSpendPerTx} MON/tx, ${policy.maxSpendPerPeriod} MON/day.`;
      }
    } else {
      // Local parsing fallback
      policy = parsePolicy(userMsg);
      response = `Configured: ${policy.maxSpendPerTx} MON per transaction, ${policy.maxSpendPerPeriod} MON per day, ` +
        `time-lock at ${policy.timeLockThreshold} MON (${parseInt(policy.timeLockDuration) / 3600}h delay), ` +
        `circuit break at ${policy.circuitBreakThreshold} MON.` +
        (policy.whitelist.length ? ` Whitelist: ${policy.whitelist.join(", ")}.` : "");
    }

    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    onPolicyGenerated(policy);
    setLoading(false);
  }

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>AI Policy Assistant</span>
      </div>

      <div className="ai-chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="ai-suggestions">
            <p className="ai-hint">Describe your guardrails in plain language:</p>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="ai-suggestion" onClick={() => { setInput(s); }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-${msg.role}`}>
            <div className="ai-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-message ai-assistant">
            <div className="ai-bubble ai-loading">Configuring...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="ai-input-form">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe your guardrail policy..."
          className="ai-input"
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
