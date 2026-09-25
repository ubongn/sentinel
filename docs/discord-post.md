Discord post for Monad Metropolis #showcase channel:

---

🛡️ **Sentinel — On-chain Guardrails for AI Agents**

**The Problem:** AI agents can bypass traditional guardrails by calling contracts directly.

**The Solution:** Sentinel uses EIP-7702 delegation to make guardrails unbypassable — every transaction goes through on-chain policy checks. No trust. No bypass.

**What it does:**
• Spending limits (per TX or time period)
• Address whitelists
• Time-locks on large transactions
• Circuit breaks (auto-pause on threshold)
• EIP-7702 smart account activation (unbypassable mode)

**Live on Monad Testnet:**
• 3 contracts deployed (SentinelRegistry, SentinelGuard, P256PolicyAuth)
• Full E2E flow: Connect → Create Policy → Register Agent → Assign Policy → Monitor
• EIP-7702 delegation verified on-chain

**Try it:** https://sentinel-monad.vercel.app
**Code:** https://github.com/ubongn/sentinel

**Built for:** Dynamic, Mera, Qwen AI, Cleanverse, Chainlink CRE

---