/**
 * Deploy SentinelAccount to Monad Testnet (JS version for Node 22 compat)
 */
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SentinelAccount with:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "MON");

  const GUARD = process.env.GUARD_ADDRESS || "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575";
  const REGISTRY = process.env.REGISTRY_ADDRESS || "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d";

  console.log("SentinelGuard:", GUARD);
  console.log("SentinelRegistry:", REGISTRY);

  const Factory = await ethers.getContractFactory("SentinelAccount");
  const contract = await Factory.deploy(GUARD, REGISTRY);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("\nSentinelAccount deployed to:", addr);

  // Verify
  const g = await contract.sentinelGuard();
  const r = await contract.sentinelRegistry();
  console.log("Verification sentinelGuard():", g);
  console.log("Verification sentinelRegistry():", r);

  console.log("\n=== DONE ===");
  console.log("Update frontend/src/config/contracts.ts:");
  console.log('  SentinelAccount: "' + addr + '"');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
