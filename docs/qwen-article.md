# How Qwen 3.8 Max Turns Plain English Into On-Chain Guardrails

**Sentinel — AI Policy Assistant, built for the Monad Metropolis hackathon (Alibaba Cloud / Qwen 3.8 Max bounty)**

---

## The problem: nobody knows how to configure a guardrail

Sentinel puts hard limits on AI agents before they can move money on-chain: spending limits, recipient whitelists, time-locks, and circuit breaks. The contracts enforce them. But there was a UX gap — the people who most need guardrails (solo developers running trading agents) know what they *want* ("don't let my agent lose more than X"), but not how to translate that intent into smart-contract parameters.

What does "1 MON per transaction" become? What's a sane daily limit? How long should a time-lock be? Before Qwen, users had to hand-fill six numeric fields and hope.

Qwen 3.8 Max closes that gap. We integrated it as the **AI Policy Assistant**: you type your intent in plain language, Qwen parses it into exact on-chain policy parameters, and the policy is created — a real transaction on Monad Testnet.

## The integration

The assistant lives in `frontend/src/components/AiAssistant.tsx` and calls the **DashScope API** (OpenAI-compatible mode) with the **`qwen-max`** model:

```
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
model: "qwen-max"
temperature: 0.3
```

The system prompt tells Qwen it is a policy-configuration assistant for an on-chain guardrail system, and constrains it to respond **only with valid JSON** matching a fixed schema:

```json
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
```

The response is parsed, mapped to a `PolicyParams` object, and pushed straight into the policy-creation form. The user reviews the prefilled numbers and submits — the result is a real on-chain policy in the SentinelRegistry/SentinelGuard contracts.

### What Qwen does for us

1. **Natural language → policy parameters.** "Limit my agent to 1 MON per transaction, whitelist only Uniswap, circuit-break if it loses 50 MON in an hour" comes back as exact numbers: `maxSpendPerTx: 1`, `whitelist: [...]`, `circuitBreakThreshold: 50`, plus a human-readable explanation.

2. **Smart defaults from intent.** "I want my agent to trade safely on DeFi" yields a conservative configuration rather than forcing the user to invent numbers.

3. **Plain-English explanations.** Every generated policy ships with an `explanation` field so users understand what each parameter does — without reading Solidity.

4. **Monad-aware context.** The system prompt anchors defaults in MON amounts and typical DeFi transaction sizes on Monad's fast blocks (1 MON/tx, 10 MON/day, 1-hour time-lock above 5 MON, circuit break at 50 MON).

### Graceful degradation

Production engineering matters in a hackathon demo. The assistant has a two-layer fallback:

- If the DashScope call fails (network, key, rate limit), a **local regex parser** extracts MON amounts, time-locks, and whitelist names from the same sentence.
- If `VITE_QWEN_API_KEY` isn't set at all, the local parser runs directly.

The UI never breaks, and the user always gets a working policy — Qwen makes it *intelligent*, the fallback makes it *reliable*.

## Why Qwen specifically

- **Structured-output discipline.** `qwen-max` follows the JSON-schema instruction reliably at `temperature: 0.3` — we get parseable policy objects, not prose.
- **The compatible-mode endpoint** means no bespoke SDK: one `fetch`, standard OpenAI-style payloads, trivially portable.
- **Value per token is the right shape for this task.** Policy parsing is short-context, high-precision work — exactly what a flagship model should be spent on.

## Try it

1. Open **https://sentinel-monad.vercel.app**
2. Go to the **Create Policy** page and open the **AI Policy Assistant**
3. Type: *"Strict mode: 0.5 MON per tx, whitelist only Uniswap, auto-pause at 2 MON"*
4. Watch the form fill itself in — then submit to create a real on-chain policy on Monad Testnet

**Repo:** https://github.com/ubongn/sentinel
**Bounty:** Alibaba Cloud — Best Builds with Qwen 3.8 Max
