# Sentinel — Demo Video Script (3 min max)

## Slide 1: Title (0:00 - 0:08)
**[Show: Sentinel logo + title slide]**

> "Sentinel — on-chain guardrails for AI agents on Monad."

---

## Slide 2: The Problem (0:08 - 0:35)
**[Show: Problem slide with 4 cards]**

> "AI agents can send your money anywhere. No spending limits. No address restrictions. No time delays. No emergency stops. One bad decision, one prompt injection — and funds are gone. Irreversibly."

---

## Slide 3: The Solution (0:35 - 1:00)
**[Show: Solution slide with 4 guardrail types]**

> "Sentinel fixes this. Users define on-chain policies with spending limits, whitelists, time-locks, and circuit breaks. Every agent transaction must pass through Sentinel's smart contracts — or it reverts. No centralized control. No trust assumptions."

---

## Slide 4: How It Works (1:00 - 1:20)
**[Show: 3-step flow + code block]**

> "Three steps. Create a policy. Register your agent. Assign the policy. From that point on, every transaction the agent tries to execute goes through executeWithGuardrails — the single entry point that checks all guardrails before execution."

---

## Slide 5: Monad Primitives (1:20 - 1:40)
**[Show: Monad primitives slide]**

> "We built this on Monad's unique primitives. P256 precompile for passkey-based policy authorization — no seed phrases. ERC-8004 for trustless on-chain agent registry. And BTX encrypted mempools so your guardrail config stays private."

---

## Slide 6: Live Demo (1:40 - 2:20)
**[Switch to live app: sentinel-monad.vercel.app]**

> "Let me show you it working. Here's the live app on Monad Testnet."

**[Connect OKX wallet]**
> "I connect my wallet — MetaMask, OKX, Coinbase, any wallet works."

**[Go to Create Policy]**
> "I create a policy — 1 MON max per transaction, 10 MON per day, time-lock on anything over 5 MON."

**[Show tx confirmation on OKX]**
> "Sign the transaction... and it's on-chain."

**[Go to Agents → Register Agent]**
> "Now I register my agent address and assign the policy."

**[Show Dashboard]**
> "The dashboard shows live data from the contracts. My agent is registered, active, and bound to the policy."

---

## Slide 7: Bounties (2:20 - 2:40)
**[Show: Bounties slide]**

> "We integrated 5 bounties — not just imports, real integrations. Dynamic SDK for wallet connection. Mera passkey for biometric policy auth. Chainlink CRE for automated circuit breaks. Qwen 3.8 Max for an AI assistant that converts natural language to policies. And Cleanverse for identity verification."

---

## Slide 8: Architecture (2:40 - 2:50)
**[Show: Architecture slide]**

> "Three contracts — SentinelRegistry, SentinelGuard, P256PolicyAuth. React frontend with 6 pages. All tested, all deployed."

---

## Slide 9: Closing (2:50 - 3:00)
**[Show: Closing slide with links]**

> "Sentinel — the trust layer for autonomous AI agents. Live on Monad Testnet. GitHub and demo link on screen. Thank you."

---

## Total: ~3:00

### Recording Tips:
- Use OBS or any screen recorder
- Record at 1080p
- Open demo-slides.html in Chrome, go fullscreen (F11)
- Arrow keys to navigate slides
- Switch to live app for the demo section
- Keep pace steady — don't rush
- Practice 2-3 times before final take
