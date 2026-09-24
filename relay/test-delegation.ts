import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const RELAYER_KEY = "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const SENTINEL_ACCOUNT = "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";
const AGENT_ADDRESS = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";

async function main() {
  console.log("Testing7702 delegation...");

  const account = privateKeyToAccount(RELAYER_KEY);
  const client = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  console.log(`Account: ${account.address}`);
  console.log(`SentinelAccount: ${SENTINEL_ACCOUNT}`);

  // Sign7702 authorization
  const authorization = await client.signAuthorization({
    account,
    contractAddress: SENTINEL_ACCOUNT,
  });

  console.log("Authorization signed:", authorization);

  // Send the7702 transaction
  const hash = await client.sendTransaction({
    account,
    authorizationList: [authorization],
    to: account.address,
    data: "0x",
    value: 0n,
  });

  console.log(`7702 delegation TX: ${hash}`);
  console.log(`Explorer: https://testnet.monadexplorer.com/tx/${hash}`);
}

main().catch(console.error);