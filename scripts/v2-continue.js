const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");

const p = new ethers.JsonRpcProvider(process.env.MONAD_RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, p);
const REGISTRY = "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d";
const GUARD_V2 = "0xe4a45e0324a206a8c3342980dfd9510595e55251";
const AGENT = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Raw broadcast: avoids ethers 6.1.0 formatTransactionResponse v/yParity bug
// that hardhat-ethers hits when re-fetching sent txs on this RPC.
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
  console.log("  tx:", hash);
  for (let i = 0; i < 60; i++) {
    const rc = await p.send("eth_getTransactionReceipt", [hash]);
    if (rc) {
      if (rc.status !== "0x1") throw new Error("REVERTED: " + hash);
      console.log("  mined @", Number(rc.blockNumber));
      return rc;
    }
    await sleep(1000);
  }
  throw new Error("timeout: " + hash);
}

async function main() {
  // 1. SentinelAccount v2 (guard immutable repoint) — idempotent
  let accountAddr = "0x9be724F7Fc030BdB388Bcec340Aa69E2F097F045";
  const existingCode = await p.send("eth_getCode", [accountAddr, "latest"]);
  if (existingCode === "0x") {
    const accArtifact = JSON.parse(
      fs.readFileSync(
        "artifacts/contracts/SentinelAccount.sol/SentinelAccount.json",
        "utf8"
      )
    );
    const ctor = new ethers.Interface(["constructor(address,address)"]);
    console.log("Deploying SentinelAccount v2...");
    const rcAcc = await sendRaw({
      to: null,
      data:
        accArtifact.bytecode +
        ctor.encodeDeploy([GUARD_V2, REGISTRY]).slice(2),
    });
    accountAddr = ethers.getAddress(rcAcc.contractAddress);
  }
  console.log("SentinelAccount v2:", accountAddr);

  // 2. Demo policy — idempotent: skip if agent already assigned policy 1
  const g = new ethers.Interface([
    "function createPolicy(uint256,uint256,uint256,uint256,uint256,uint256,address[])",
    "function setPolicyForAgent(address,uint256)",
    "function agentPolicies(address) view returns (uint256,bool,uint256,uint256)",
    "function canExecute(address,address,uint256) view returns (bool,string)",
  ]);
  let apRaw = await p.call({
    to: GUARD_V2,
    data: g.encodeFunctionData("agentPolicies", [AGENT]),
  });
  let policyId = BigInt("0x" + apRaw.slice(2).slice(0, 64));
  if (policyId === 0n) {
    console.log("Creating demo policy...");
    await sendRaw({
      to: GUARD_V2,
      data: g.encodeFunctionData("createPolicy", [
        ethers.parseEther("0.1"),
        ethers.parseEther("10"),
        86400,
        3600,
        ethers.parseEther("5"),
        ethers.parseEther("0.25"),
        [GUARD_V2, AGENT],
      ]),
    });
    console.log("Assigning policy to demo agent...");
    await sendRaw({
      to: GUARD_V2,
      data: g.encodeFunctionData("setPolicyForAgent", [AGENT, 1n]),
    });
    apRaw = await p.call({
      to: GUARD_V2,
      data: g.encodeFunctionData("agentPolicies", [AGENT]),
    });
    policyId = BigInt("0x" + apRaw.slice(2).slice(0, 64));
  }
  console.log("agent policyId:", policyId);
  const checks = [
    ["in-limit to self (0.1)", AGENT, "0.1"],
    ["in-limit to guard (0.1)", GUARD_V2, "0.1"],
    ["blocked 0.5 to self", AGENT, "0.5"],
    ["whitelist violation", "0x000000000000000000000000000000000000dEaD", "0.1"],
  ];
  // canExecute(agent, to, value)
  for (const [label, to, amt] of checks) {
    const data = g.encodeFunctionData("canExecute", [
      AGENT,
      to,
      ethers.parseEther(amt),
    ]);
    const raw = await p.call({ to: GUARD_V2, data });
    const decoded = g.decodeFunctionResult("canExecute", raw);
    console.log(
      `  ${label}: allowed=${decoded[0]} reason=${decoded[1] || '""'}`
    );
  }

  // 4. NotAgent check live on new guard
  const guardIface = new ethers.Interface([
    "function executeWithGuardrails(address,address,uint256,bytes)",
    "error NotAgent(address,address)",
  ]);
  try {
    await p.call({
      from: "0x0000000000000000000000000000000000000020",
      to: GUARD_V2,
      data: guardIface.encodeFunctionData("executeWithGuardrails", [
        AGENT,
        AGENT,
        1n,
        "0x",
      ]),
    });
    console.log("  NotAgent: FAILED (no revert!)");
  } catch (e) {
    const isNotAgent =
      e.message.includes("NotAgent") ||
      (e.data && e.data.includes(guardIface.getFunction("executeWithGuardrails").selector));
    console.log(
      "  NotAgent revert:",
      (e.data || e.message || "").slice(0, 100),
      isNotAgent ? "OK" : "(check manually)"
    );
  }

  const out = {
    chainId: 10143,
    deployer: wallet.address,
    contracts: {
      SentinelRegistry: REGISTRY,
      SentinelGuard: GUARD_V2,
      SentinelAccount: accountAddr,
      P256PolicyAuth: JSON.parse(fs.readFileSync("deployed.json", "utf8"))
        .contracts.P256PolicyAuth,
    },
    demoPolicyId: Number(policyId),
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync("deployed-v2.json", JSON.stringify(out, null, 2));
  console.log("=== V2 STATE WRITTEN ===");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("FATAL", e.message || e);
  process.exitCode = 1;
});
