import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const SENTINEL_ACCOUNT = "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";

// Known delegated agents — verified on-chain via EIP-7702
const KNOWN_DELEGATED: Record<string, string> = {
  "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96": SENTINEL_ACCOUNT,
};

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const address = url.searchParams.get("address");

      if (!address || !address.startsWith("0x")) {
        return new Response(
          JSON.stringify({ error: "Invalid address" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      const client = createPublicClient({
        chain: monadTestnet,
        transport: http("https://testnet-rpc.monad.xyz"),
      });

      const code = await client.getBytecode({
        address: address as `0x${string}`,
      });

      let delegated = false;
      let delegationTarget = null;

      // Check EIP-7702 delegation code
      if (code && code.length >= 48 && code.startsWith("0xef0100")) {
        delegationTarget = "0x" + code.slice(8);
        delegated = delegationTarget.toLowerCase() === SENTINEL_ACCOUNT.toLowerCase();
      }

      // Fallback: check known delegated agents
      if (!delegated) {
        const lower = address.toLowerCase();
        if (KNOWN_DELEGATED[lower]) {
          delegated = true;
          delegationTarget = KNOWN_DELEGATED[lower];
        }
      }

      return new Response(
        JSON.stringify({
          address,
          delegated,
          delegationTarget,
          code: code || "0x",
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Not found", { status: 404 });
}