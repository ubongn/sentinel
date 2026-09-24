const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { monadTestnet } = require("viem/chains");

// This is the relayer key — in production, use a secure key management service
const RELAYER_KEY = process.env.RELAYER_KEY || "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const SENTINEL_ACCOUNT = process.env.SENTINEL_ACCOUNT || "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";

const http_1 = require("http");
const url = require("url");

const server = http_1.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/delegate") {
    try {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { agentAddress } = JSON.parse(body);

      if (!agentAddress || !agentAddress.startsWith("0x")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid agent address" }));
        return;
      }

      console.log(`Delegating ${agentAddress} to SentinelAccount...`);

      const account = privateKeyToAccount(RELAYER_KEY);
      const client = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http("https://testnet-rpc.monad.xyz"),
      });

      // Sign7702 authorization
      const authorization = await client.signAuthorization({
        account,
        contractAddress: SENTINEL_ACCOUNT,
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

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        txHash: hash,
        explorer: `https://testnet.monadexplorer.com/tx/${hash}`,
        message: "Agent is now unbypassable via EIP-7702"
      }));

    } catch (e) {
      console.error("Delegation failed:", e.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", sentinelAccount: SENTINEL_ACCOUNT }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Sentinel7702 relay running on port ${PORT}`);
  console.log(`SentinelAccount: ${SENTINEL_ACCOUNT}`);
});