import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const RELAYER_KEY = "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const SENTINEL_ACCOUNT = "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";
const RPC = "https://testnet-rpc.monad.xyz";
const FUND_AMOUNT = parseEther("15"); // 15 MON each (need ≥10 for7702)

// Already delegated
const EXISTING = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";

async function main() {
  const relayer = privateKeyToAccount(RELAYER_KEY);
  const client = createWalletClient({
    account: relayer,
    chain: monadTestnet,
    transport: http(RPC),
  });
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(RPC),
  });

  const balance = await publicClient.getBalance({ address: relayer.address });
  console.log(`Relayer balance: ${formatEther(balance)} MON`);

  // Generate3 new agent wallets
  const agents: { address: string; key: string }[] = [];

  for (let i = 0; i < 3; i++) {
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    agents.push({ address: account.address, key });
    console.log(`Generated agent ${i + 1}: ${account.address}`);
  }

  // Fund each agent with15 MON
  for (const agent of agents) {
    console.log(`Funding ${agent.address} with 15 MON...`);
    const hash = await client.sendTransaction({
      to: agent.address as `0x${string}`,
      value: FUND_AMOUNT,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Funded (${receipt.status}): https://testnet.monadexplorer.com/tx/${hash}`);
    // Wait for balance to propagate
    await new Promise(r => setTimeout(r, 3000));
    const bal = await publicClient.getBalance({ address: agent.address as `0x${string}` });
    console.log(`Balance: ${formatEther(bal)} MON`);
  }

  // Delegate each agent to SentinelAccount
  for (const agent of agents) {
    console.log(`\nDelegating ${agent.address} to SentinelAccount...`);

    const bal = await publicClient.getBalance({ address: agent.address as `0x${string}` });
    console.log(`Balance before delegation: ${formatEther(bal)} MON`);

    if (bal < parseEther("0.01")) {
      console.log(`SKIP: insufficient balance for gas`);
      continue;
    }

    const agentAccount = privateKeyToAccount(agent.key as `0x${string}`);
    const agentClient = createWalletClient({
      account: agentAccount,
      chain: monadTestnet,
      transport: http(RPC),
    });

    const nonce = await publicClient.getTransactionCount({
      address: agentAccount.address,
    });
    console.log(`Nonce: ${nonce}`);

    const authorization = await agentClient.signAuthorization({
      account: agentAccount,
      contractAddress: SENTINEL_ACCOUNT as `0x${string}`,
    });

    const hash = await agentClient.sendTransaction({
      authorizationList: [authorization],
      to: agentAccount.address,
      data: "0x",
      value: 0n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Delegated (${receipt.status}): https://testnet.monadexplorer.com/tx/${hash}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Output the agents for KNOWN_DELEGATED map
  console.log("\n=== Add to KNOWN_DELEGATED in contracts.ts ===");
  console.log(`"${EXISTING.toLowerCase()}": "${SENTINEL_ACCOUNT}",`);
  for (const agent of agents) {
    console.log(`"${agent.address.toLowerCase()}": "${SENTINEL_ACCOUNT}",`);
  }
  console.log("\n=== Agent Private Keys (save these!) ===");
  for (const agent of agents) {
    console.log(`${agent.address}: ${agent.key}`);
  }
}

main().catch(console.error);