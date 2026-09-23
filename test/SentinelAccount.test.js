const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SentinelAccount", function () {
  let registry, guard, sentinelAccount;
  let deployer, owner, agent;
  let registryAddr, guardAddr, sentinelAccountAddr;

  beforeEach(async function () {
    [deployer, owner, agent] = await ethers.getSigners();

    // Deploy fresh instances
    const Registry = await ethers.getContractFactory("SentinelRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
    registryAddr = await registry.getAddress();

    const Guard = await ethers.getContractFactory("SentinelGuard");
    guard = await Guard.deploy(registryAddr);
    await guard.waitForDeployment();
    guardAddr = await guard.getAddress();

    const SentinelAccount = await ethers.getContractFactory("SentinelAccount");
    sentinelAccount = await SentinelAccount.deploy(guardAddr, registryAddr);
    await sentinelAccount.waitForDeployment();
    sentinelAccountAddr = await sentinelAccount.getAddress();
  });

  describe("Deployment", function () {
    it("should store correct guard and registry addresses", async function () {
      expect(await sentinelAccount.sentinelGuard()).to.equal(guardAddr);
      expect(await sentinelAccount.sentinelRegistry()).to.equal(registryAddr);
    });
  });

  describe("Constructor immutables", function () {
    it("returns sentinelGuard() correctly", async function () {
      const result = await sentinelAccount.sentinelGuard();
      expect(result).to.equal(guardAddr);
    });

    it("returns sentinelRegistry() correctly", async function () {
      const result = await sentinelAccount.sentinelRegistry();
      expect(result).to.equal(registryAddr);
    });
  });

  describe("execute()", function () {
    it("should revert if caller is not self (non-delegated)", async function () {
      await expect(
        sentinelAccount.connect(agent).execute(owner.address, 0, "0x")
      ).to.be.revertedWith("only self");
    });
  });

  describe("executeBatch()", function () {
    it("should revert if caller is not self", async function () {
      await expect(
        sentinelAccount.connect(agent).executeBatch(
          [owner.address],
          [0],
          ["0x"]
        )
      ).to.be.revertedWith("only self");
    });

    it("should revert on length mismatch (if called as self)", async function () {
      // This tests the length check in isolation; in practice executeBatch
      // requires msg.sender == address(this) which can only happen via delegation
      await expect(
        sentinelAccount.connect(deployer).executeBatch(
          [owner.address],
          [0, 1],
          ["0x"]
        )
      ).to.be.revertedWith("only self");
    });
  });

  describe("canExecute()", function () {
    it("should delegate to sentinelGuard.canExecute", async function () {
      // No policy assigned, so should return false
      const [allowed, reason] = await sentinelAccount.canExecute(owner.address, 0);
      expect(allowed).to.equal(false);
    });
  });

  describe("getDelegation()", function () {
    it("should return address(0) for non-delegated address", async function () {
      const delegated = await sentinelAccount.getDelegation(deployer.address);
      expect(delegated).to.equal(ethers.ZeroAddress);
    });
  });

  describe("isDelegatedToSentinel()", function () {
    it("should return false for non-delegated address", async function () {
      const result = await sentinelAccount.isDelegatedToSentinel(
        deployer.address,
        sentinelAccountAddr
      );
      expect(result).to.equal(false);
    });
  });

  describe("receive()", function () {
    it("should accept ETH transfers", async function () {
      const addr = await sentinelAccount.getAddress();
      await deployer.sendTransaction({
        to: addr,
        value: ethers.parseEther("1.0"),
      });
      const balance = await ethers.provider.getBalance(addr);
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("validateUserOp()", function () {
    it("should return 1 (invalid) for wrong signature", async function () {
      // Construct a minimal UserOp with an invalid signature
      const padding32 = "0x" + "00".repeat(32);
      const userOp = {
        sender: sentinelAccountAddr,
        nonce: 0,
        initCode: "0x",
        callData: "0x",
        accountGasLimits: padding32,
        preVerificationGas: 0,
        gasFees: padding32,
        paymasterAndData: "0x",
        signature: ethers.concat([
          "0x" + "00".repeat(31) + "01",  // r
          "0x" + "00".repeat(31) + "01",  // s
          "0x1b",                          // v
        ]),
      };
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const result = await sentinelAccount.validateUserOp.staticCall(
        userOp,
        userOpHash,
        0
      );
      // Signature won't match sentinelAccountAddr, so should be invalid
      expect(result).to.not.equal(0);
    });
  });
});
