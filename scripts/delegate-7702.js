const { ethers } = require("ethers");

const PRIVATE_KEY = "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const RPC_URL = "https://testnet-rpc.monad.xyz";
const CHAIN_ID = 10143;
const SENTINEL_ACCOUNT = "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c";
const AGENT_ADDRESS = "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Wallet address:", wallet.address);
  console.log("SentinelAccount:", SENTINEL_ACCOUNT);
  
  // Check current delegation
  const code = await provider.getCode(AGENT_ADDRESS);
  console.log("Current code at agent:", code === "0x" ? "None (EOA)" : "Delegated");
  
  if (wallet.address.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) {
    console.error("Wallet address doesn't match agent address!");
    console.error("Wallet:", wallet.address);
    console.error("Agent:", AGENT_ADDRESS);
    return;
  }
  
  // Get nonce
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log("Nonce:", nonce);
  
  // Create EIP-7702 authorization
  // The authorization tuple: [chain_id, address, nonce]
  // We need to sign this with the EOA's private key
  
  // EIP-7702 authorization hash = keccak256(MAGIC || rlp([chain_id, address, nonce]))
  // MAGIC = 0x05
  const MAGIC = "0x05";
  
  // RLP encode [chain_id, address, nonce]
  const rlpEncoded = ethers.encodeRlp([
    ethers.toBeHex(CHAIN_ID),
    SENTINEL_ACCOUNT,
    ethers.toBeHex(nonce)
  ]);
  
  // Authorization hash
  const authHash = ethers.keccak256(
    ethers.concat([MAGIC, rlpEncoded])
  );
  
  console.log("Authorization hash:", authHash);
  
  // Sign the authorization hash
  const signingKey = new ethers.SigningKey(PRIVATE_KEY);
  const signature = signingKey.sign(authHash);
  
  console.log("Signature:", {
    r: signature.r,
    s: signature.s,
    v: signature.v,
    yParity: signature.yParity
  });
  
  // Create the7702 transaction
  // Type4 transaction with authorization list
  const tx = {
    type: 4, // EIP-7702
    to: wallet.address, // send to self
    value: 0,
    data: "0x",
    chainId: CHAIN_ID,
    nonce: nonce,
    gasLimit: 100000,
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    authorizationList: [{
      chainId: CHAIN_ID,
      address: SENTINEL_ACCOUNT,
      nonce: nonce,
      yParity: signature.yParity,
      r: signature.r,
      s: signature.s
    }]
  };
  
  console.log("Sending7702 transaction...");
  
  // Sign and send the transaction
  const signedTx = await wallet.sendTransaction(tx);
  console.log("Transaction hash:", signedTx.hash);
  
  const receipt = await signedTx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  
  // Check delegation after
  const codeAfter = await provider.getCode(AGENT_ADDRESS);
  console.log("Code at agent after:", codeAfter === "0x" ? "None (EOA)" : "Delegated");
  console.log("Delegation target:", codeAfter.includes(SENTINEL_ACCOUNT.slice(2).toLowerCase()) ? "SentinelAccount ✅" : "Different");
}

main().catch(console.error);