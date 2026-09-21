import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Sentinel contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON");

  // 1. Deploy SentinelRegistry
  console.log("\n--- Deploying SentinelRegistry ---");
  const Registry = await ethers.getContractFactory("SentinelRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("SentinelRegistry deployed to:", registryAddr);

  // 2. Deploy SentinelGuard (needs registry address)
  console.log("\n--- Deploying SentinelGuard ---");
  const Guard = await ethers.getContractFactory("SentinelGuard");
  const guard = await Guard.deploy(registryAddr);
  await guard.waitForDeployment();
  const guardAddr = await guard.getAddress();
  console.log("SentinelGuard deployed to:", guardAddr);

  // 3. Deploy P256PolicyAuth (needs guard address)
  console.log("\n--- Deploying P256PolicyAuth ---");
  const P256 = await ethers.getContractFactory("P256PolicyAuth");
  const p256 = await P256.deploy(guardAddr);
  await p256.waitForDeployment();
  const p256Addr = await p256.getAddress();
  console.log("P256PolicyAuth deployed to:", p256Addr);

  // 4. Write deployment info
  const deployment = {
    chainId: 10143,
    deployer: deployer.address,
    contracts: {
      SentinelRegistry: registryAddr,
      SentinelGuard: guardAddr,
      P256PolicyAuth: p256Addr,
    },
    deployedAt: new Date().toISOString(),
  };

  const fs = await import("fs");
  fs.writeFileSync("deployed.json", JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info written to deployed.json");
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
