// Workaround: ethers.js v6 + Monad yParity issue
// Deploy each contract individually, skip receipt parsing
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const RPC = process.env.MONAD_RPC;
const KEY = process.env.DEPLOYER_PRIVATE_KEY;
const REGISTRY_ADDR = "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(KEY, provider);
  console.log("Deployer:", wallet.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "MON");

  // Load compiled contract artifacts
  const registryArt = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "SentinelRegistry.sol", "SentinelRegistry.json"), "utf8"));
  const guardArt = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "SentinelGuard.sol", "SentinelGuard.json"), "utf8"));
  const p256Art = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "P256PolicyAuth.sol", "P256PolicyAuth.json"), "utf8"));

  // 2. Deploy SentinelGuard (needs registry address)
  console.log("\n--- Deploying SentinelGuard ---");
  const GuardFactory = new ethers.ContractFactory(guardArt.abi, guardArt.bytecode, wallet);
  const guard = await GuardFactory.deploy(REGISTRY_ADDR);
  console.log("SentinelGuard tx:", guard.deploymentTransaction().hash);
  // Wait for mining but don't parse receipt
  await guard.deploymentTransaction().wait(2);
  const guardAddr = await guard.getAddress();
  console.log("SentinelGuard deployed to:", guardAddr);

  // 3. Deploy P256PolicyAuth (needs guard address)
  console.log("\n--- Deploying P256PolicyAuth ---");
  const P256Factory = new ethers.ContractFactory(p256Art.abi, p256Art.bytecode, wallet);
  const p256 = await P256Factory.deploy(guardAddr);
  console.log("P256PolicyAuth tx:", p256.deploymentTransaction().hash);
  await p256.deploymentTransaction().wait(2);
  const p256Addr = await p256.getAddress();
  console.log("P256PolicyAuth deployed to:", p256Addr);

  const deployment = {
    chainId: 10143,
    deployer: wallet.address,
    contracts: {
      SentinelRegistry: REGISTRY_ADDR,
      SentinelGuard: guardAddr,
      P256PolicyAuth: p256Addr,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(__dirname, "..", "deployed.json"), JSON.stringify(deployment, null, 2));
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
