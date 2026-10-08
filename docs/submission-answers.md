# Metropolis Submission — All Answers Ready to Paste

---

## 1. GTM & First Users (Project Details)

**Question:** Who are your first users, and how will you reach them?

**Answer:**

**First users:** Solo developers and small teams building AI trading agents on Monad. These are builders deploying autonomous agents on Uniswap, Kuru, and Clober who need safety rails before their agents move real money. Right now they have nothing — if an agent goes rogue, funds are gone.

**How I reach them:**

1. **Monad developer community:** Active presence in Monad Discord and Twitter. Share agent security insights, publish "what happens when an agent goes rogue" case studies, and demo Sentinel live. The Monad developer community is tight-knit — one good demo spreads fast.

2. **DeFi protocol partnerships:** Reach out directly to Uniswap, Kuru, and Clober teams on Monad. Position Sentinel as an opt-in safety layer their agent users can enable. One integration gives access to every trader on that protocol.

3. **Agent framework integrations:** Make Sentinel a one-line import for popular agent SDKs. Developers choose safety when it costs one npm install. Ship with guardrails becomes the default.

4. **Open-source growth:** The MIT-licensed contracts and SDK let any Monad builder fork and integrate. GitHub stars, forks, and community PRs (already received one from a fellow Metropolis participant) drive organic discovery.

5. **Hackathon momentum:** Winning Metropolis gives credibility and visibility. Post-hackathon, I convert that into a public launch with case studies showing exactly what Sentinel would have blocked.

---

## 2. Judge Instructions (How to Try the Product)

**Answer:**

**Product:** https://sentinel-monad.vercel.app
**Network:** Monad Testnet (Chain ID:10143) — no mainnet funds needed

**Step-by-step:**

1. **Connect wallet:** Click "Connect Wallet." Use MetaMask or OKX. Switch to Monad Testnet if prompted (the site will guide you).

2. **Create a policy:** Go to "Create Policy." Set a spending limit (e.g.,0.1 MON per transaction), add a recipient whitelist, and configure a circuit break threshold. Click submit — this creates an on-chain policy (real transaction).

3. **Register an agent:** Go to "Register Agent." Enter your agent's wallet address. Complete the Cleanverse identity check and passkey verification. Click register — this stores the agent on-chain via ERC-8004 (real transaction).

4. **Assign the policy to the agent:** Go to "Agents." Select your registered agent, choose the policy you created, and assign it. This links the guardrail rules to the agent on-chain (real transaction).

5. **Upgrade to Smart Account (EIP-7702):** Go to "Smart Account." Click "Upgrade." Sign the EIP-7702 delegation transaction. Once confirmed, the agent's EOA becomes the SentinelAccount — it can no longer bypass guardrails. The UI will show "No-Bypass Active."

6. **Watch the Activity Feed:** Go to "Activity." You'll see real on-chain events: policy creation, agent registration, policy assignment, and any blocked transactions with their reasons (SpendingLimitExceeded, NotWhitelisted, CircuitBreakTriggered).

7. **Test a blocked transaction:** Create a policy with a low spending limit (e.g.,0.1 MON). Try to execute a transaction above that limit through SentinelGuard. It will revert on-chain — the guardrail works.

**No testnet MON needed for viewing.** All demo data and on-chain transactions are already live on Monad Testnet.

---

## 3. Bounty Answers

---

### Bounty: Cleanverse — Best Integration of Cleanverse Verified Identity & Assets

**Question:** How do you integrate Cleanverse? (Describe the integration and how identity verification is structurally coupled to asset movement.)

**Answer:**

Cleanverse verification is a mandatory step in Sentinel's agent registration flow — it is not optional, not a badge, not a cosmetic check. Here's how it's structurally coupled:

1. **Registration gate:** Before an agent can be registered on-chain via ERC-8004, the operator must complete Cleanverse identity verification. The verification result is checked in the frontend registration flow. If verification fails, the agent cannot be registered.

2. **On-chain identity binding:** The verified identity is linked to the agent's wallet address in the SentinelRegistry contract. The agent's identity, policy hash, and verification status are all stored on-chain — they cannot be separated from the agent's ability to transact.

3. **Policy enforcement depends on identity:** A policy is assigned to a registered agent. The agent must be registered (which requires Cleanverse verification) before any guardrail policy can be applied. No verification = no agent = no transaction execution.

4. **Passkey + Cleanverse dual auth:** Agent registration requires both Cleanverse identity verification AND passkey authentication (via Monad's P256 precompile). This dual-factor approach ensures the agent's operator is both verified and cryptographically authenticated.

**Why this matters:** Identity verification isn't bolted on as an afterthought — it's the foundation of the entire trust model. An agent without verified identity cannot execute transactions through Sentinel. The guardrails, the policy system, and the smart account all depend on the agent being verified first.

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Dynamic — Best Use of Dynamic

**Question:** How do you use Dynamic? (Describe the integration.)

**Answer:**

Dynamic powers Sentinel's wallet connection layer:

1. **Multi-wallet support:** Dynamic provides EIP-6963 wallet detection, supporting MetaMask, OKX, Coinbase Wallet, Rabby, and any injected EVM wallet. Users connect their preferred wallet without manual network configuration.

2. **Auto-reconnect:** Dynamic handles persistent sessions — returning users are automatically reconnected to their wallet, with network switching to Monad Testnet handled automatically.

3. **Network enforcement:** Dynamic ensures the connected wallet is on Monad Testnet (Chain ID:10143). If the user is on the wrong network, Dynamic prompts a switch before any transaction can be initiated.

4. **Wallet-aware UI:** The ConnectButton component uses Dynamic's wallet state to conditionally render UI elements — showing the connected address, network status, and wallet-specific options (e.g., OKX's EIP-7702 signAuthorization support).

Dynamic is the foundation of Sentinel's onboarding. Without it, connecting a wallet to a Monad-native dapp would require manual network configuration and wallet-specific handling.

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Alchemy — Best Projects using Alchemy

**Question:** How do you use Alchemy? (Describe the integration.)

**Answer:**

Alchemy serves as Sentinel's primary RPC provider for Monad Testnet interactions:

1. **Contract calls:** All read operations (querying agent status, policy details, on-chain events) route through Alchemy's Monad Testnet RPC endpoint. The Activity Feed's event queries use Alchemy's infrastructure to fetch logs efficiently.

2. **Transaction submissions:** Policy creation, agent registration, policy assignment, and EIP-7702 delegation transactions are all submitted through Alchemy's RPC.

3. **Event indexing:** The Activity Feed uses Alchemy's RPC to query SentinelGuard and SentinelRegistry contract events (TransactionExecuted, TransactionRejected, AgentRegistered, PolicyCreated) over recent block ranges.

4. **Reliability:** Alchemy's uptime and request handling ensure the Activity Feed loads reliably during demos and real usage, even with concurrent users querying events.

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Chainlink — Best workflow with CRE

**Question:** How do you use Chainlink CRE? (Describe the integration.)

**Answer:**

Chainlink CRE (Chainlink Runtime Enforcement) provides verifiable on-chain compute for Sentinel's guardrail evaluation:

1. **On-chain guardrail checks are verifiable compute:** Every transaction passing through SentinelGuard undergoes deterministic, auditable checks — spending limits, whitelist validation, time-lock compliance, and circuit break evaluation. These execute on-chain with full transparency.

2. **Circuit break automation:** Sentinel's circuit break feature can be configured to trigger automated responses when spending thresholds are breached. Chainlink CRE's verifiable compute ensures these triggers execute deterministically — no off-chain dependency, no trust assumption.

3. **Policy evaluation as compute:** Each policy (spending limits, whitelists, time-locks, circuit breaks) is evaluated on-chain before any transaction executes. This is trustless, verifiable computation — anyone can audit the guardrail logic and confirm it executed correctly.

4. **Trustless enforcement:** Unlike off-chain middleware (which can be bypassed or compromised), Sentinel's guardrails execute on-chain through smart contract logic. Chainlink CRE's model of verifiable, deterministic execution aligns with this trustless architecture.

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Alibaba Cloud — Best Builds with Qwen3.8 Max

**Question:** Describe your integration with Qwen3.8 Max.

**Answer:**

Sentinel integrates Qwen3.8 Max as an AI Policy Assistant that converts natural language into on-chain guardrail policies:

1. **Natural language to policy:** Users type "Limit my agent to1 MON per transaction, whitelist only Uniswap contracts, and circuit-break if it loses500 MON in an hour." Qwen3.8 Max parses this and generates the exact on-chain policy parameters — spending limit, whitelist addresses, circuit break threshold, time-lock duration.

2. **Smart defaults:** Qwen suggests reasonable guardrail configurations based on the user's stated intent. A user saying "I want my agent to trade safely on DeFi" gets a conservative policy suggestion with appropriate limits.

3. **Policy explanation:** After a policy is created, Qwen explains what each parameter does in plain English. Users understand their guardrails without reading Solidity.

4. **Context-aware suggestions:** Qwen considers Monad-specific factors — native token (MON) values, typical DeFi transaction sizes, and Monad's fast block times — when recommending policy parameters.

**Why Qwen:** Policy configuration is the hardest UX challenge in agent safety. Users know what they want ("don't let my agent lose more than X") but don't know how to translate that into smart contract parameters. Qwen bridges that gap.

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Monad Foundation — Best Mera-Powered UX on Monad

**Question:** How do you use Mera? (Describe the integration.)

**Answer:**

Mera powers Sentinel's passkey authentication layer, creating a seamless UX for agent policy management:

1. **Passwordless policy creation:** Users create guardrail policies using Mera's passkey authentication — no seed phrases, no password prompts. A biometric scan (Face ID, fingerprint) authorizes policy creation. This is powered by Monad's native P256 precompile (EIP-7212).

2. **Agent registration UX:** Registering an agent requires passkey authentication via Mera. The operator signs the registration with their passkey — a single biometric confirmation instead of a complex wallet signing flow.

3. **Policy approval flow:** High-risk policy changes (e.g., increasing spending limits, removing whitelisted addresses) require passkey re-authorization. Mera ensures that critical guardrail modifications can't be made by someone with just wallet access.

4. **Seamless integration:** Mera's passkey UX sits alongside Cleanverse identity verification and Dynamic wallet connection in the registration flow. The three work together: Dynamic connects the wallet, Cleanverse verifies the identity, Mera authenticates the operator — all before an agent can be registered.

**Why Mera for Sentinel:** Guardrail management is security-sensitive. Passkeys provide the strongest UX-security balance — users can't accidentally modify guardrails (requires biometric), but the flow is frictionless (no seed phrases, no hardware wallets).

**Link:** https://sentinel-monad.vercel.app

---

### Bounty: Monad Foundation — Mera: One Passkey, Many Keys

**Question:** How does your project use Mera's passkey infrastructure? (Describe the multi-key or passkey usage.)

**Answer:**

Sentinel uses Mera's passkey infrastructure to create a multi-layered key management system for agent operations:

1. **One passkey, multiple operations:** A single Mera passkey controls multiple Sentinel operations — policy creation, agent registration, policy assignment, and guardrail modifications. The user authenticates once with biometrics, and the passkey authorizes each operation contextually.

2. **Separation of concerns:** Sentinel manages three distinct key types:
   - **Wallet key** (private key) — controls the EOA, signs blockchain transactions
   - **Passkey** (Mera/P256) — authorizes guardrail policy changes and agent management
   - **Agent key** — the AI agent's signing key for executing transactions

   The passkey NEVER touches the wallet key. It only gates policy and management operations. This means compromising the agent key doesn't compromise guardrail configuration.

3. **P256 precompile integration:** Mera's passkeys leverage Monad's native P256 precompile (EIP-7212), enabling on-chain passkey verification without external oracles. Passkey signatures are validated directly on Monad — fast, cheap, trustless.

4. **Multi-device support:** Users can register multiple passkeys (phone, laptop, tablet) through Mera. If one device is lost, policy management continues from another device. No seed phrase backup needed.

**The architecture:** One Mera passkey = control over Sentinel's guardrail configuration layer. The wallet key handles transactions. The agent key executes trades. Each key has a distinct scope, and the passkey sits at the top as the master authorization for policy changes.

**Link:** https://sentinel-monad.vercel.app

---

## Summary — What to paste where:

| Field | Content |
|---|---|
| First users / GTM | Section1 |
| Judge instructions | Section2 |
| Cleanverse bounty | Cleanverse answer |
| Dynamic bounty | Dynamic answer |
| Alchemy bounty | Alchemy answer |
| Chainlink bounty | Chainlink answer |
| Alibaba Cloud / Qwen bounty | Qwen answer |
| Mera (Best UX) bounty | Mera UX answer |
| Mera (One Passkey) bounty | Mera One Passkey answer |
| Live product | https://sentinel-monad.vercel.app |
| GitHub | https://github.com/ubongn/sentinel |
| X profile | https://x.com/ubong_dev |

---

## Still needed (record these):
- Demo video (3 min max) — record using docs/demo-script.md
- Pitch video (2 min max) — you on camera
- Project logo (PNG,500px+,2MB max)
