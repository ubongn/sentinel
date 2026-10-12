# Sentinel — Demo Video Script (Screen Recording)

**Duration:** Under3 minutes
**Format:** Screen recording + voiceover
**Rules:** Must show product in actual operation (no slides)

---

## Setup before recording
- Open https://sentinel-monad.vercel.app in your browser
- Connect OKX wallet on Monad Testnet
- Clear the Activity Feed or start fresh if needed
- Record at1080p, full screen

---

## Opening (0:00 -0:10)

**[Screen: Landing page]**

> "This is Sentinel — on-chain guardrails for AI agents on Monad. Autonomous agents can move real money. Without guardrails, a compromised agent drains your wallet in one transaction. Sentinel stops that at the smart contract level."

---

## Step1: Connect Wallet (0:10 -0:20)

**[Screen: Click "Connect Wallet", select OKX]**

> "First, I connect my wallet. Sentinel supports any EVM wallet — MetaMask, OKX, Coinbase — via EIP-6963."

---

## Step2: Create Policy (0:20 -0:50)

**[Screen: Navigate to Create Policy]**

> "I create a policy — this defines what my agent is allowed to do. I set a spending limit of0.1 MON per transaction, add a whitelist, and configure a circuit break threshold. This is an on-chain transaction."

**[Screen: Submit the policy, show transaction confirming]**

> "The policy is now live on Monad Testnet. Contract call confirmed."

---

## Step3: Register Agent (0:50 -1:20)

**[Screen: Navigate to Register Agent]**

> "Now I register my AI agent. This requires two things: Cleanverse identity verification and passkey authentication via Monad's P256 precompile. No seed phrases — just biometrics."

**[Screen: Complete verification, submit registration]**

> "Agent registered on-chain via ERC-8004. The agent now has a verifiable on-chain identity."

---

## Step4: Assign Policy (1:20 -1:35)

**[Screen: Go to Agents tab, assign policy]**

> "I assign the guardrail policy to my agent. The policy hash is stored on-chain — the agent cannot modify it."

**[Screen: Transaction confirms]**

> "Done. The agent is now bound by these rules."

---

## Step5: EIP-7702 Smart Account (1:35 -2:05)

**[Screen: Navigate to Smart Account tab]**

> "Here's the key innovation. I upgrade the agent to a smart account using EIP-7702. This makes the agent's wallet BECOME Sentinel's account. Every transaction must pass through guardrails — no bypass possible."

**[Screen: Click upgrade, sign the delegation, show confirmation]**

> "Delegation confirmed on-chain. The UI now shows 'No-Bypass Active.' The agent physically cannot circumvent the guardrails."

---

## Step6: Activity Feed (2:05 -2:35)

**[Screen: Navigate to Activity Feed]**

> "Here's the real-time activity feed. Every on-chain event is logged: policy creation, agent registration, policy assignment."

**[Screen: Show the blocked transaction if available]**

> "And here — a transaction that was BLOCKED. The agent tried to exceed its spending limit. SentinelGuard reverted it on-chain. Reason: SpendingLimitExceeded. The guardrail worked."

**[Screen: Show other events with reasons]**

> "You can see all guardrail checks: spending limits, whitelist violations, circuit break triggers — all enforced at the smart contract level."

---

## Step7: Dashboard Overview (2:35 -2:50)

**[Screen: Navigate to Dashboard]**

> "The dashboard shows everything at a glance: registered agents, active policies, spending status, and the no-bypass indicator."

---

## Closing (2:50 -3:00)

**[Screen: Back to landing page]**

> "Sentinel. On-chain guardrails for AI agents on Monad. Agents that can't go rogue. Built for Monad Metropolis."

**[End recording]**

---

## Recording checklist
- [ ] Screen recording at1080p
- [ ] Voiceover narrated clearly
- [ ] All transactions visible on-chain
- [ ] Activity Feed shows real events
- [ ] "No-Bypass Active" badge visible
- [ ] Under3 minutes
- [ ] Upload to YouTube (unlisted or public)
