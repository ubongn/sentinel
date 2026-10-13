const hre = require("hardhat");
const fs = require("fs");

// Re-deploys SentinelGuard + SentinelAccount only.
// - SentinelRegistry and P256PolicyAuth are intentionally NOT redeployed:
//   agent registrations and passkeys live there and must survive.
// - Requires: agent caller check (NotAgent) + honest circuit-break semantics
//   in SentinelGuard.sol.
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Sentinel v2 with:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON");

  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const registryAddr = deployed.contracts.SentinelRegistry;
  console.log("Keeping registry:", registryAddr);

  console.log("\n--- Deploying SentinelGuard (v2) ---");
  const Guard = await hre.ethers.getContractFactory("SentinelGuard");
  const guard = await Guard.deploy(registryAddr);
  await guard.waitForDeployment();
  const guardAddr = await guard.getAddress();
  console.log("SentinelGuard v2:", guardAddr);

  console.log("\n--- Deploying SentinelAccount (v2) ---");
  const Account = await hre.ethers.getContractFactory("SentinelAccount");
  const account = await Account.deploy(guardAddr, registryAddr);
  await account.waitForDeployment();
  const accountAddr = await account.getAddress();
  console.log("SentinelAccount v2:", accountAddr);

  const out = {
    chainId: 10143,
    deployer: deployer.address,
    contracts: {
      SentinelRegistry: registryAddr,
      SentinelGuard: guardAddr,
      SentinelAccount: accountAddr,
      P256PolicyAuth: deployed.contracts.P256PolicyAuth,
    },
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync("deployed-v2.json", JSON.stringify(out, null, 2));
  console.log("\n=== V2 DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
