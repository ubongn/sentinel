const { ethers } = require("ethers");
require("dotenv").config();

const p = new ethers.JsonRpcProvider(process.env.MONAD_RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, p);
const GUARD = "0xE4A45e0324A206a8c3342980dFD9510595e55251";
const AGENT = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const guardIface = new ethers.Interface([
  "function executeWithGuardrails(address,address,uint256,bytes)",
  "function pauseAgent(address)",
  "function unpauseAgent(address)",
]);
const accountIface = new ethers.Interface([
  "function execute(address,uint256,bytes) payable returns (bytes)",
]);

async function sendRaw(tx) {
  const blk = await p.send("eth_getBlockByNumber", ["latest", false]);
  const tip = ethers.parseUnits("2", "gwei");
  const maxFee = BigInt(blk.baseFeePerGas) * 2n + tip;
  const est = await p.send("eth_estimateGas", [
    {
      from: wallet.address,
      to: tx.to ?? null,
      data: tx.data ?? "0x",
      value: "0x" + (tx.value ?? 0n).toString(16),
      maxFeePerGas: "0x" + maxFee.toString(16),
      maxPriorityFeePerGas: "0x" + tip.toString(16),
    },
  ]);
  const nonceHex = await p.send("eth_getTransactionCount", [
    wallet.address,
    "pending",
  ]);
  const signed = await wallet.signTransaction({
    to: tx.to ?? null,
    data: tx.data ?? "0x",
    value: tx.value ?? 0n,
    gasLimit: BigInt(est),
    nonce: parseInt(nonceHex, 16),
    chainId: 10143,
    type: 2,
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: tip,
  });
  const hash = await p.send("eth_sendRawTransaction", [signed]);
  for (let i = 0; i < 60; i++) {
    const rc = await p.send("eth_getTransactionReceipt", [hash]);
    if (rc) {
      if (rc.status !== "0x1") throw new Error("REVERTED: " + hash);
      return { hash, block: Number(rc.blockNumber) };
    }
    await sleep(1000);
  }
  throw new Error("timeout: " + hash);
}

async function main() {
  // 0. Ensure guard holds a float for value-bearing executions
  const gBal = await p.getBalance(GUARD);
  if (gBal < ethers.parseEther("0.2")) {
    console.log("Funding guard float...");
    const f = await sendRaw({ to: GUARD, value: ethers.parseEther("0.3") });
    console.log("  fund tx:", f.hash);
  }

  // 1. Real executed tx through the EIP-7702 path:
  //    agent EOA (delegated) → SentinelAccount.execute → Guard guardrails
  console.log("Executed tx via 7702 path...");
  const ex = await sendRaw({
    to: AGENT, // delegated frame
    data: accountIface.encodeFunctionData("execute", [
      GUARD, // target (whitelisted)
      ethers.parseEther("0.1"),
      "0x",
    ]),
  });
  console.log("  TransactionExecuted:", ex.hash);

  // 2. Pause + unpause for AgentPaused feed rows (ends unpaused)
  console.log("Pause...");
  const pa = await sendRaw({
    to: GUARD,
    data: guardIface.encodeFunctionData("pauseAgent", [AGENT]),
  });
  console.log("  AgentPaused:", pa.hash);
  console.log("Unpause...");
  const un = await sendRaw({
    to: GUARD,
    data: guardIface.encodeFunctionData("unpauseAgent", [AGENT]),
  });
  console.log("  AgentUnpaused:", un.hash);

  // 3. Confirm the events exist on-chain
  const latest = await p.getBlockNumber();
  const logs = await p.send("eth_getLogs", [
    {
      address: [GUARD],
      fromBlock: "0x" + (latest - 300).toString(16),
      toBlock: "latest",
    },
  ]);
  const names = {};
  for (const l of logs) {
    const t = l.topics[0];
    names[t] = (names[t] || 0) + 1;
  }
  console.log("Guard events in last 300 blocks:", JSON.stringify(names, null, 2));
}

main().catch((e) => {
  console.error("FATAL", e.message || e);
  process.exitCode = 1;
});
