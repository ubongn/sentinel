import { createWalletClient, http, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./frontend/node_modules/viem/chains/dist/cjs/chains.js";

const PRIVATE_KEY = "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const SENTINEL_ACCOUNT = "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Account:", account.address);

  const client = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  console.log("Signing EIP-7702 authorization for SentinelAccount:", SENTINEL_ACCOUNT);

  // Sign the authorization
  const authorization = await client.signAuthorization({
    account,
    contractAddress: SENTINEL_ACCOUNT,
  });

  console.log("Authorization signed:", authorization);

  // Send the type 4 transaction
  console.log("Sending7702 delegation transaction...");
  const hash = await client.sendTransaction({
    account,
    authorizationList: [authorization],
    to: account.address,
    data: "0x",
    value: 0n,
  });

  console.log("Transaction hash:", hash);
  console.log("Explorer: https://testnet.monadexplorer.com/tx/" + hash);
}

main().catch(console.error);