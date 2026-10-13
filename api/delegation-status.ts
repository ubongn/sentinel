import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const SENTINEL_ACCOUNT = "0x9be724F7Fc030BdB388Bcec340Aa69E2F097F045";

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

      // On-chain code is the source of truth; no static fallback — a dropped
      // delegation must surface as delegated=false, never as a masked "true".

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