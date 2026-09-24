import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const AGENT_ADDRESS = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";

async function main() {
  console.log("Checking delegation status...");

  const client = createPublicClient({
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  // Get the code at the agent address
  const code = await client.getBytecode({
    address: AGENT_ADDRESS,
  });

  console.log(`Agent: ${AGENT_ADDRESS}`);
  console.log(`Code: ${code}`);
  console.log(`Code length: ${code ? code.length : 0}`);

  if (code && code.length > 2) {
    // Check if it's a delegation designator (0xef0100 + address)
    if (code.startsWith("0xef0100")) {
      const delegatedTo = "0x" + code.slice(8);
      console.log("✅ Agent is delegated to:", delegatedTo);
    } else {
      console.log("Agent has code but not a delegation designator");
    }
  } else {
    console.log("❌ Agent has no code (not delegated)");
  }
}

main().catch(console.error);