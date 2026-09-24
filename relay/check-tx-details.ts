import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const TX_HASH = "0xf04ea66ad78146a50fff03f55f4595dbd2866a3309c5239fcf8f0e649820007a";

async function main() {
  console.log("Checking transaction details...");

  const client = createPublicClient({
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  const tx = await client.getTransaction({
    hash: TX_HASH,
  });

  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Value:", tx.value.toString());
  console.log("Input:", tx.input);
  console.log("Type:", tx.type);
  console.log("Authorization list:", tx.authorizationList);
}

main().catch(console.error);