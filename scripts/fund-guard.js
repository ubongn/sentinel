const { ethers } = require("ethers");
require("dotenv").config();

const p = new ethers.JsonRpcProvider(process.env.MONAD_RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, p);
const CHAIN_ID = 10143;
const ACCOUNT = "0x9be724F7Fc030BdB388Bcec340Aa69E2F097F045";
const GUARD = "0xE4A45e0324A206a8c3342980dFD9510595e55251";
const ZERO = "0x0000000000000000000000000000000000000000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rlpUint = (n) => (BigInt(n) === 0n ? "0x" : ethers.toBeHex(BigInt(n)));

async function fee() {
  const blk = await p.send("eth_getBlockByNumber", ["latest", false]);
  const tip = ethers.parseUnits("2", "gwei");
  return { tip, maxFee: BigInt(blk.baseFeePerGas) * 2n + tip };
}

async function sendRaw(tx) {
  const { tip, maxFee } = await fee();
  let gas;
  try {
    gas = await p.send("eth_estimateGas", [
      {
        from: wallet.address,
        to: tx.to ?? null,
        data: tx.data ?? "0x",
        value: "0x" + (tx.value ?? 0n).toString(16),
        maxFeePerGas: "0x" + maxFee.toString(16),
        maxPriorityFeePerGas: "0x" + tip.toString(16),
      },
    ]);
  } catch (e) {
    throw new Error("estimate failed: " + (e.data || e.message).slice(0, 160));
  }
  const nonceHex = await p.send("eth_getTransactionCount", [
    wallet.address,
    "pending",
  ]);
  const signed = await wallet.signTransaction({
    to: tx.to ?? null,
    data: tx.data ?? "0x",
    value: tx.value ?? 0n,
    gasLimit: BigInt(gas),
    nonce: parseInt(nonceHex, 16),
    chainId: CHAIN_ID,
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

// EIP-7702 self-tx with an authorization tuple (manual RLP — ethers 6.1.0
// cannot sign type 4). delegate = target designator address (ZERO to clear).
async function delegationTx(delegate) {
  const nonce = await p.getTransactionCount(wallet.address, "pending");
  const authNonce = nonce + 1; // tx consumes a nonce before auths process
  const { tip, maxFee } = await fee();

  const authHash = ethers.keccak256(
    ethers.concat([
      "0x05",
      ethers.encodeRlp([ethers.toBeHex(CHAIN_ID), delegate, ethers.toBeHex(authNonce)]),
    ])
  );
  const sig = new ethers.SigningKey(process.env.DEPLOYER_PRIVATE_KEY).sign(authHash);

  const payload = [
    rlpUint(CHAIN_ID),
    rlpUint(nonce),
    rlpUint(tip),
    rlpUint(maxFee),
    rlpUint(100000),
    ethers.getBytes(wallet.address),
    rlpUint(0),
    "0x",
    [],
    [
      [
        rlpUint(CHAIN_ID),
        ethers.getBytes(delegate),
        rlpUint(authNonce),
        rlpUint(sig.yParity),
        sig.r,
        sig.s,
      ],
    ],
  ];
  const sighash = ethers.keccak256(
    ethers.concat(["0x04", ethers.encodeRlp(payload)])
  );
  const txSig = new ethers.SigningKey(process.env.DEPLOYER_PRIVATE_KEY).sign(sighash);
  const rawTx = ethers.concat([
    "0x04",
    ethers.encodeRlp([...payload, rlpUint(txSig.yParity), txSig.r, txSig.s]),
  ]);
  const hash = ethers.keccak256(rawTx);
  await p.send("eth_sendRawTransaction", [rawTx]);
  for (let i = 0; i < 60; i++) {
    const rc = await p.send("eth_getTransactionReceipt", [hash]);
    if (rc) {
      if (rc.status !== "0x1") throw new Error("delegation tx REVERTED");
      return hash;
    }
    await sleep(1000);
  }
  throw new Error("delegation timeout");
}

async function main() {
  const phase = process.argv[2];
  if (phase === "undelegate") {
    console.log("Clearing delegation so the agent can send value txs...");
    console.log("tx:", await delegationTx(ZERO));
    const code = await p.getCode(wallet.address);
    console.log("code now:", code.slice(0, 20), code === "0x" ? "(plain EOA ✓)" : "");
  } else if (phase === "fund") {
    const gBal = await p.getBalance(GUARD);
    console.log("guard balance:", ethers.formatEther(gBal));
    if (gBal < ethers.parseEther("0.3")) {
      const r = await sendRaw({ to: GUARD, value: ethers.parseEther("0.5") });
      console.log("funded guard:", r.hash);
    }
    console.log("guard balance now:", ethers.formatEther(await p.getBalance(GUARD)));
  } else if (phase === "redelegate") {
    console.log("Re-delegating to SentinelAccount v2...");
    console.log("tx:", await delegationTx(ACCOUNT));
    const code = await p.getCode(wallet.address);
    const ok = code.toLowerCase().includes(ACCOUNT.slice(2).toLowerCase());
    console.log("delegated:", ok ? "YES" : "NO", "| code:", code.slice(0, 60));
    console.log("agent balance:", ethers.formatEther(await p.getBalance(wallet.address)));
  } else {
    console.log("usage: node scripts/fund-guard.js undelegate|fund|redelegate");
  }
}

main().catch((e) => {
  console.error("FATAL", e.message || e);
  process.exitCode = 1;
});
