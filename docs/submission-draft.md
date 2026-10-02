# Sentinel — Metropolis Submission Draft

## Project Name
Sentinel

## One-line Description
On-chain guardrails that make AI agents unable to go rogue.

## Full Description
Sentinel is the trust layer for autonomous AI agents on Monad. It lets users define on-chain guardrails — spending limits, address whitelists, time-locks, and circuit breaks — that every agent transaction must pass through before execution.

The key innovation is EIP-7702 smart account delegation: once an agent is delegated, it physically cannot bypass Sentinel's guardrails. There's no off-chain shortcut, no trusted server, no way around the checks. The guardrails live in the smart contract, and the smart contract is the only way to execute.

Sentinel targets DeFi trading agents — the fastest-growing agent category on Monad, with protocols like Uniswap, Kuru, and Clober enabling autonomous trading. These agents move real money. Sentinel ensures they do it within boundaries the user controls.

Built with: Solidity smart contracts, React + viem frontend, EIP-7702 delegation, P256 precompile for passkey auth, ERC-8004 for on-chain agent registry.

## GTM & User Acquisition Strategy

1. **Developer-first adoption:** Open-source SDK and documentation so any DeFi protocol on Monad can integrate Sentinel guardrails into their agent framework. One npm install, one function call.

2. **Agent framework partnerships:** Partner with agent frameworks building on Monad (e.g., agent SDKs, trading bots) to make Sentinel the default safety layer. "Ship with guardrails" becomes the standard.

3. **DeFi protocol integrations:** Work with Uniswap, Kuru, Clober, and other Monad DeFi protocols to offer Sentinel as an opt-in safety layer for their agent users.

4. **Community building:** Share agent security insights, publish case studies of agent exploits (what Sentinel would have prevented), and build reputation in the Monad developer community.

5. **Bounty sponsor integrations:** Leverage existing integrations with Dynamic (wallet), Mera (passkey), Chainlink CRE (automated circuit breaks), Qwen AI (natural language policies), and Cleanverse (identity) to reach each sponsor's user base.

## Links for Submission

- **Product:** https://sentinel-monad.vercel.app
- **GitHub:** https://github.com/ubongn/sentinel
- **Demo Video:** [TO BE RECORDED]
- **Pitch Video:** [TO BE RECORDED]

## Bounties Applied For
1. Dynamic — Wallet connection SDK
2. Mera — Passkey biometric auth
3. Qwen AI — Natural language policy creation
4. Cleanverse — Identity verification
5. Chainlink CRE — Automated circuit breaks