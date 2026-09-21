# Sentinel

**On-chain guardrails for AI agents on Monad.**

Sentinel lets you define spending limits, whitelists, time-locks, and circuit breaks for AI agents — enforced by smart contracts on Monad. No bypass. No trust required.

## Architecture

### Smart Contracts

| Contract | Purpose |
|---|---|
| **SentinelRegistry** | ERC-8004 compliant trustless agent registry |
| **SentinelGuard** | Core guardrail engine — spending limits, whitelists, time-locks, circuit breaks |
| **P256PolicyAuth** | Passkey-based policy authorization via Monad's P256 precompile (EIP-7212) |

### Frontend

- React + Vite + TypeScript
- Dynamic SDK for multi-wallet connection (MetaMask, WalletConnect, embedded wallets)
- WebAuthn passkey authentication via Mera PRF-derived keys
- AI Policy Assistant powered by Qwen 3.8 Max
- Cleanverse identity verification for agent registration
- Chainlink-style automation monitor for circuit break triggers

## Smart Contract Details

### SentinelRegistry

ERC-8004 compliant agent registry. Each agent registers on-chain with its guardrail policy hash attached.

```solidity
registerAgent(address agent, bytes32 policyHash, string metadata)
updatePolicyHash(address agent, bytes32 newPolicyHash)
deactivateAgent(address agent)
reactivateAgent(address agent)
```

### SentinelGuard

Core guardrail engine. All agent transactions must route through this contract.

```solidity
createPolicy(maxSpendPerTx, maxSpendPerPeriod, periodDuration, timeLockDuration, timeLockThreshold, circuitBreakThreshold, whitelist[])
setPolicyForAgent(address agent, uint256 policyId)
executeWithGuardrails(address agent, address to, uint256 value, bytes data)
pauseAgent(address agent)
unpauseAgent(address agent)
```

### P256PolicyAuth

Passkey-based policy authorization using Monad's native P256 precompile.

```solidity
registerPasskey(bytes32 credentialId, bytes32 x, bytes32 y)
authorizePolicyChange(bytes32 credentialId, bytes32 policyHash, bytes signature, uint256 nonce, uint256 timestamp)
```

## How It Works

1. **Create Policy** — Define spending limits, whitelists, time-locks, and circuit break thresholds.
2. **Register Agent** — Register your AI agent on-chain with its guardrail policy attached (ERC-8004).
3. **Agent Executes** — All transactions route through Sentinel's guardrail contract. No bypass possible.
4. **Monitor & Control** — Real-time activity feed. Pause or adjust guardrails at any time.

## Monad Primitives Used

- **P256 Precompile (EIP-7212)** — Native passkey verification at address `0x100`
- **ERC-8004** — Trustless agent registry standard
- **Parallel Execution** — Guardrail checks at Monad's 10k TPS

## Bounty Integrations

### Dynamic SDK ($5K)
- Wallet connection via Dynamic SDK with multi-wallet support
- Embedded wallets for agent identities
- Email/social login alongside traditional wallet connections

### Mera Passkey Auth ($5K)
- WebAuthn passkey registration and policy authorization
- P256 signature verification via Monad precompile
- No seed phrases needed for policy management

### Chainlink CRE ($3K)
- Automated circuit breaker monitoring
- Spending threshold detection with configurable time windows
- Auto-pause agents when limits are exceeded

### Qwen 3.8 Max ($5K credits)
- AI Policy Assistant for natural language policy configuration
- "Limit my agent to 1 MON per transaction, whitelist only Uniswap" → parsed policy
- DashScope API integration with local fallback parser

### Cleanverse ($2K)
- Identity verification gate for agent registration
- CVI (Cleanverse Verification Index) score requirement
- Verified identities eligible for agent deployment

## Development

```bash
# Install dependencies
npm install
cd frontend && npm install

# Run tests
npx hardhat test

# Compile contracts
npx hardhat compile

# Deploy to Monad Testnet
npx hardhat run scripts/deploy.ts --network monad_testnet

# Frontend dev server
cd frontend && npm run dev
```

## Monad Testnet

- **Chain ID:** 10143
- **RPC:** https://testnet-rpc.monad.xyz
- **Explorer:** https://monad-testnet.socialscan.io

## License

MIT
