import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const RELAYER_KEY = process.env.RELAYER_KEY || "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const SENTINEL_ACCOUNT = process.env.SENTINEL_ACCOUNT || "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";

export default async function handler(req: Request): Promise<Response> {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === "POST") {
    try {
      const { agentAddress } = await req.json();

      if (!agentAddress || !agentAddress.startsWith("0x")) {
        return new Response(
          JSON.stringify({ error: "Invalid agent address" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      console.log(`Delegating ${agentAddress} to SentinelAccount...`);

      const account = privateKeyToAccount(RELAYER_KEY as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http("https://testnet-rpc.monad.xyz"),
      });

      // Sign7702 authorization
      const authorization = await client.signAuthorization({
        account,
        contractAddress: SENTINEL_ACCOUNT as `0x${string}`,
      });

      // Send the7702 transaction
      const hash = await client.sendTransaction({
        account,
        authorizationList: [authorization],
        to: account.address,
        data: "0x",
        value: 0n,
      });

      console.log(`7702 delegation TX: ${hash}`);

      return new Response(
        JSON.stringify({
          success: true,
          txHash: hash,
          explorer: `https://testnet.monadexplorer.com/tx/${hash}`,
          message: "Agent is now unbypassable via EIP-7702",
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      console.error("Delegation failed:", e.message);
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  }

  // Health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", sentinelAccount: SENTINEL_ACCOUNT }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  return new Response("Not found", { status: 404 });
}