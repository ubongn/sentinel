/**
 * Standalone deployment script for SentinelAccount.sol
 *
 * Deploys only the EIP-7702 SentinelAccount contract,
 * connecting it to the already-deployed SentinelGuard and SentinelRegistry.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-account.ts --network monad_testnet
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SentinelAccount with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "MON"
  );

  // Use existing deployed addresses
  const GUARD_ADDRESS = process.env.GUARD_ADDRESS || "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575";
  const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d";

  console.log("\nConnecting to:");
  console.log("  SentinelGuard:", GUARD_ADDRESS);
  console.log("  SentinelRegistry:", REGISTRY_ADDRESS);

  console.log("\n--- Deploying SentinelAccount ---");
  const SentinelAccount = await ethers.getContractFactory("SentinelAccount");
  const sentinelAccount = await SentinelAccount.deploy(GUARD_ADDRESS, REGISTRY_ADDRESS);
  await sentinelAccount.waitForDeployment();
  const sentinelAccountAddr = await sentinelAccount.getAddress();
  console.log("SentinelAccount deployed to:", sentinelAccountAddr);

  // Verify the deployment
  const guardAddr = await sentinelAccount.sentinelGuard();
  const registryAddr = await sentinelAccount.sentinelRegistry();
  console.log("\nVerification:");
  console.log("  sentinelGuard():", guardAddr);
  console.log("  sentinelRegistry():", registryAddr);

  // Output deployment summary
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("SentinelAccount:", sentinelAccountAddr);
  console.log("\nUpdate frontend/src/config/contracts.ts:");
  console.log(`  SentinelAccount: "${sentinelAccountAddr}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
