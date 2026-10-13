const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { monadTestnet } = require("viem/chains");

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not set — add it to .env");
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

  const authorization = await client.signAuthorization({
    account,
    contractAddress: SENTINEL_ACCOUNT,
  });

  console.log("Authorization signed, sending transaction...");

  const hash = await client.sendTransaction({
    account,
    authorizationList: [authorization],
    to: account.address,
    data: "0x",
    value: 0n,
  });

  console.log("TX Hash:", hash);
  console.log("Explorer: https://testnet.monadexplorer.com/tx/" + hash);
}

main().catch(console.error);