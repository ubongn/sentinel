const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.MONAD_RPC || "https://testnet-rpc.monad.xyz";
const CHAIN_ID = 10143;
// SentinelAccount v2 (points at Guard v2)
const SENTINEL_ACCOUNT = "0x9be724F7Fc030BdB388Bcec340Aa69E2F097F045";
const AGENT_ADDRESS = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log("Wallet:", wallet.address);
  if (wallet.address.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) {
    throw new Error("key does not match agent address");
  }

  const code = await provider.getCode(AGENT_ADDRESS);
  console.log("Current delegation code length:", code.length);

  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  // The tx increments the signer nonce before authorizations are processed,
  // so the auth tuple must carry nonce+1 or it is silently skipped.
  const authNonce = nonce + 1;
  const blk = await provider.send("eth_getBlockByNumber", ["latest", false]);
  const tip = ethers.parseUnits("2", "gwei");
  const maxFee = BigInt(blk.baseFeePerGas) * 2n + tip;

  // EIP-7702 authorization: keccak256(0x05 || rlp([chainId, delegate, nonce]))
  const authHash = ethers.keccak256(
    ethers.concat([
      "0x05",
      ethers.encodeRlp([
        ethers.toBeHex(CHAIN_ID),
        SENTINEL_ACCOUNT,
        ethers.toBeHex(authNonce),
      ]),
    ])
  );
  const signature = new ethers.SigningKey(
    process.env.DEPLOYER_PRIVATE_KEY
  ).sign(authHash);

  // ethers 6.1.0 cannot sign type-4 txs — build + sign the raw RLP ourselves
  const rlpUint = (n) =>
    BigInt(n) === 0n ? "0x" : ethers.toBeHex(BigInt(n));
  const payload = [
    rlpUint(CHAIN_ID),
    rlpUint(nonce),
    rlpUint(tip),
    rlpUint(maxFee),
    rlpUint(100000),
    ethers.getBytes(wallet.address), // to: self (as in the proven original flow)
    rlpUint(0), // value
    "0x", // data
    [], // accessList
    [
      [
        rlpUint(CHAIN_ID),
        ethers.getBytes(SENTINEL_ACCOUNT),
        rlpUint(authNonce),
        rlpUint(signature.yParity),
        signature.r,
        signature.s,
      ],
    ],
  ];
  const sighash = ethers.keccak256(
    ethers.concat(["0x04", ethers.encodeRlp(payload)])
  );
  const txSig = new ethers.SigningKey(
    process.env.DEPLOYER_PRIVATE_KEY
  ).sign(sighash);
  const rawTx = ethers.concat([
    "0x04",
    ethers.encodeRlp([
      ...payload,
      rlpUint(txSig.yParity),
      txSig.r,
      txSig.s,
    ]),
  ]);
  const txHash = ethers.keccak256(rawTx);

  console.log("Sending7702 delegation tx (auth nonce", nonce, ")...");
  await provider.send("eth_sendRawTransaction", [rawTx]);
  console.log("tx:", txHash);

  // raw receipt poll (avoids ethers response formatter bugs on this RPC)
  let rc = null;
  for (let i = 0; i < 60; i++) {
    rc = await provider.send("eth_getTransactionReceipt", [txHash]);
    if (rc) break;
    await sleep(1000);
  }
  if (!rc || rc.status !== "0x1") {
    console.log("RECEIPT:", JSON.stringify(rc));
    throw new Error("delegation tx failed");
  }
  console.log("mined @", Number(rc.blockNumber));

  await sleep(3000);
  const codeAfter = await provider.getCode(AGENT_ADDRESS);
  const ok = codeAfter
    .toLowerCase()
    .includes(SENTINEL_ACCOUNT.slice(2).toLowerCase());
  console.log("delegation now points at Account v2:", ok ? "YES" : "NO");
  console.log("code:", codeAfter.slice(0, 60));
  const bal = await provider.getBalance(AGENT_ADDRESS);
  console.log("agent balance:", ethers.formatEther(bal), "MON");
}

main().catch((e) => {
  console.error("FATAL", e.message || e);
  process.exitCode = 1;
});
