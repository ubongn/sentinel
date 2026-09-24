const { ethers } = require("ethers");

const PRIVATE_KEY = "0x47cdd49b89d9f7eb14b5b8c1fca89fdaba1d406be7e5f4c1edf43336f7ba4700";
const RPC = "https://testnet-rpc.monad.xyz";
const GUARD_ADDRESS = "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575";

const GUARD_ABI = [
  "function createPolicy(string memory name, uint256 spendingLimit, address[] memory whitelistedAddresses, uint256 dailyLimit, uint256 circuitBreakThreshold) returns (uint256)",
  "function executeWithGuardrails(address agent, address target, uint256 value, bytes calldata data) returns (bool)",
  "function agentPolicies(address) view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const guard = new ethers.Contract(GUARD_ADDRESS, GUARD_ABI, wallet);

  console.log("Wallet:", wallet.address);

  // Execute a guardrail-checked transaction (policy already assigned)
  console.log("Executing guardrail-checked transaction...");
  try {
    const tx = await guard.executeWithGuardrails(
      wallet.address,
      wallet.address,
      ethers.parseEther("0.01"),
      "0x"
    );
    const receipt = await tx.wait();
    console.log("Guardrail check passed! TX:", receipt.hash);
  } catch (e) {
    console.log("Guardrail blocked:", e.message.slice(0, 200));
  }
}

main().catch(console.error);