# Sentinel

**On-chain guardrails for AI agents on Monad — with EIP-7702 no-bypass enforcement.**

Autonomous AI agents can execute transactions on your behalf. Without guardrails, a compromised or misaligned agent can drain your entire wallet in a single transaction. Sentinel enforces safety at the smart contract level: spending limits, whitelists, time-locks, and circuit breaks. All on-chain. No bypass. No trust required.

**The differentiator:** Sentinel uses Monad's native EIP-7702 support to make the agent's EOA *become* the SentinelAccount. The agent literally cannot bypass guardrails because the account itself IS Sentinel.

---

## The Problem

AI agents are becoming autonomous. They trade, transfer tokens, and interact with DeFi protocols — all without human review in real-time. But what happens when an agent goes rogue? A misaligned prompt, a compromised API, or a hallucinated instruction can send your entire balance to an attacker. Today, there is no safety layer between an agent and your wallet.

## The Solution

Sentinel is a smart contract guardrail system that sits between AI agents and the blockchain. Every agent transaction must pass through Sentinel's on-chain checks before execution:

```
User creates policy (limits, whitelist, timelocks)
    |
    v
Policy assigned to agent on-chain (ERC-8004)
    |
    v
Agent wants to execute transaction
    |
    v
SentinelGuard.check() -- on-chain validation
    |
    +-- Spending limit OK? ---------> NO --> TX REVERTS
    +-- Recipient whitelisted? -----> NO --> TX REVERTS  
    +-- Time-lock exceeded? ---------> YES -> QUEUE TX
    +-- Circuit break triggered? ----> YES -> AGENT PAUSED
    |
    v
All checks pass --> TX EXECUTES
```

The agent cannot bypass Sentinel. The guardrail logic lives in the smart contract, not in the agent's code.

---

## Architecture

### Traditional Approach (Opt-in Middleware)
```
Agent EOA → calls Sentinel.executeWithGuardrails() → target contract
Agent EOA → can also call target directly (BYPASS!)
```
*Problem: Agents can skip Sentinel entirely if they hold their own key.*

### Sentinel's Approach (EIP-7702 Delegation — No Bypass)
```
Agent EOA = SentinelAccount contract (via EIP-7702 delegation)
ALL transactions from that EOA go through Sentinel's guardrail checks
No bypass possible — Sentinel IS the account
```

Sentinel uses **Monad's native EIP-7702 support** to make guardrails unbypassable. When an agent owner "upgrades to smart account," their agent's EOA delegates to `SentinelAccount` via a type `0x04` transaction. From that point, every transaction originating from that EOA executes through Sentinel's validation logic — spending limits, whitelists, time-locks, and circuit breaks are enforced at the account level, not the application level.

**Why EIP-7702 on Monad:**
- Monad has native EIP-7702 support — no separate bundler infrastructure needed
- Delegation is permanent until revoked — agents can't opt-out mid-execution
- Compatible with ERC-4337 for gas sponsorship and session keys
- Agent gets smart wallet features (batching, social recovery) as a side effect

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                   │
│  Create Policy  |  Register Agent  |  Monitor Feed   │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
               v                      v
┌──────────────────────┐  ┌───────────────────────────┐
│  SentinelRegistry     │  │  SentinelGuard             │
│  (ERC-8004)           │  │  - Spending limits         │
│  - Agent registration │  │  - Whitelist checks        │
│  - Policy hash attach │  │  - Time-lock enforcement   │
│                       │  │  - Circuit break triggers   │
└──────────────────────┘  └───────────────────────────┘
               │                      │
               v                      v
┌─────────────────────────────────────────────────────┐
│              P256PolicyAuth                           │
│  Passkey-based policy authorization                  │
│  Uses Monad's native P256 precompile (EIP-7212)      │
└─────────────────────────────────────────────────────┘
```

---

## Smart Contracts

| Contract | Address (Monad Testnet) | Purpose |
|---|---|---|
| **SentinelRegistry** | `0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d` | ERC-8004 agent registry |
| **SentinelGuard** | `0x1b86A7dEe864f859127bE6Ff93DeA0342824d575` | Core guardrail engine |
| **SentinelAccount** | *(deploying)* | EIP-7702 smart account — no-bypass guardrails |
| **P256PolicyAuth** | `0x25375F29fC151f9A3fb0DF494C1c3a9603CB09D2` | Passkey authorization |

**Chain:** Monad Testnet (Chain ID: 10143)  
**RPC:** `https://testnet-rpc.monad.xyz`  
**Explorer:** https://monad-testnet.socialscan.io

---

## How to Use

1. **Connect Wallet** -- Connect any EVM wallet via EIP-6963 (MetaMask, OKX, Coinbase, etc.)
2. **Create Policy** -- Set spending limits, whitelists, time-locks, and circuit break thresholds. Use a preset (Conservative / Balanced / Aggressive) or configure manually. AI assistant available for natural language input.
3. **Register Agent** -- Register your AI agent's address on-chain with Cleanverse identity verification and passkey authentication.
4. **Assign Policy** -- Link a policy to your registered agent. The policy hash is stored on-chain.
5. **Upgrade to Smart Account** -- Make guardrails unbypassable. Sign an EIP-7702 delegation to make Sentinel the agent's account itself. All transactions now go through Sentinel's checks.
6. **Monitor** -- Watch the Activity Feed for real-time transaction checks. Pause agents instantly if something looks wrong.

---

## Tech Stack

- **Smart Contracts:** Solidity, Hardhat, Monad Testnet
- **Frontend:** React 19, TypeScript, Vite, ethers.js v6, viem (for EIP-7702)
- **Wallet:** EIP-6963 multi-wallet detection, EIP-6963 auto-reconnect
- **Authentication:** WebAuthn passkeys via Monad P256 precompile (EIP-7212)
- **Identity:** Cleanverse verification for agent registration
- **AI:** Qwen 3.8 Max via DashScope API for policy assistant

---

## Bounty Integrations

### Dynamic SDK ($5K)
Wallet connection via Dynamic SDK with multi-wallet support and embedded wallets for agent identities.

### Mera Passkey Auth ($5K)
WebAuthn passkey registration and policy authorization using Monad's native P256 precompile. No seed phrases.

### Chainlink CRE ($3K)
Automated circuit breaker monitoring with spending threshold detection and configurable time windows.

### Qwen 3.8 Max ($5K credits)
AI Policy Assistant for natural language policy configuration. "Limit my agent to 1 MON per transaction, whitelist only Uniswap" produces a working policy.

### Cleanverse ($2K)
Identity verification gate for agent registration with CVI (Cleanverse Verification Index) scoring.

---

## Development

```bash
# Install dependencies
npm install
cd frontend && npm install

# Compile contracts
nhardhat compile

# Run tests
npx hardhat test

# Deploy to Monad Testnet
npx hardhat run scripts/deploy.ts --network monad_testnet

# Deploy just SentinelAccount (if other contracts already deployed)
npx hardhat run scripts/deploy-account.ts --network monad_testnet

# Frontend dev server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build
```

---

## License

MIT
