import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const TX_HASH = "0xf04ea66ad78146a50fff03f55f4595dbd2866a3309c5239fcf8f0e649820007a";

async function main() {
  console.log("Checking transaction receipt...");

  const client = createPublicClient({
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  const receipt = await client.getTransactionReceipt({
    hash: TX_HASH,
  });

  console.log("Status:", receipt.status);
  console.log("Block:", receipt.blockNumber.toString());
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Contract Address:", receipt.contractAddress);
}

main().catch(console.error);