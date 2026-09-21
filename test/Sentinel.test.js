const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Sentinel", function () {
  let registry, guard, p256, owner, agentOwner, agent, user, target;

  beforeEach(async function () {
    [owner, agentOwner, agent, user, target] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("SentinelRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Guard = await ethers.getContractFactory("SentinelGuard");
    guard = await Guard.deploy(await registry.getAddress());
    await guard.waitForDeployment();

    const P256 = await ethers.getContractFactory("P256PolicyAuth");
    p256 = await P256.deploy(await guard.getAddress());
    await p256.waitForDeployment();
  });

  describe("SentinelRegistry", function () {
    it("should register an agent", async function () {
      const policyHash = ethers.keccak256(ethers.toUtf8Bytes("test-policy"));
      await registry.connect(agentOwner).registerAgent(agent.address, policyHash, '{"name":"Test Agent"}');
      const info = await registry.getAgent(agent.address);
      expect(info.owner).to.equal(agentOwner.address);
      expect(info.policyHash).to.equal(policyHash);
      expect(info.active).to.be.true;
    });

    it("should not allow duplicate registration", async function () {
      const policyHash = ethers.keccak256(ethers.toUtf8Bytes("test-policy"));
      await registry.connect(agentOwner).registerAgent(agent.address, policyHash, "");
      await expect(
        registry.connect(agentOwner).registerAgent(agent.address, policyHash, "")
      ).to.be.revertedWithCustomError(registry, "AgentAlreadyRegistered");
    });

    it("should update policy hash", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("policy-1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("policy-2"));
      await registry.connect(agentOwner).registerAgent(agent.address, hash1, "");
      await registry.connect(agentOwner).updatePolicyHash(agent.address, hash2);
      const info = await registry.getAgent(agent.address);
      expect(info.policyHash).to.equal(hash2);
    });

    it("should deactivate and reactivate agent", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("policy"));
      await registry.connect(agentOwner).registerAgent(agent.address, hash, "");
      await registry.connect(agentOwner).deactivateAgent(agent.address);
      expect(await registry.isActiveAgent(agent.address)).to.be.false;
      await registry.connect(agentOwner).reactivateAgent(agent.address);
      expect(await registry.isActiveAgent(agent.address)).to.be.true;
    });

    it("should paginate agents", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("policy"));
      await registry.connect(agentOwner).registerAgent(owner.address, hash, "");
      await registry.connect(agentOwner).registerAgent(agent.address, hash, "");
      await registry.connect(agentOwner).registerAgent(user.address, hash, "");
      const page = await registry.getAgentsPaginated(0, 2);
      expect(page.length).to.equal(2);
      expect(page[0]).to.equal(owner.address);
      expect(page[1]).to.equal(agent.address);
    });
  });

  describe("SentinelGuard", function () {
    beforeEach(async function () {
      const policyHash = ethers.keccak256(ethers.toUtf8Bytes("test-policy"));
      await registry.connect(agentOwner).registerAgent(agent.address, policyHash, "");
    });

    it("should create a policy and allow execution", async function () {
      const tx = await guard.connect(owner).createPolicy(
        ethers.parseEther("100"), ethers.parseEther("1000"), 86400, 0, 0, 0, []
      );
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      const policyId = 1n;
      await guard.connect(owner).setPolicyForAgent(agent.address, policyId);
      await owner.sendTransaction({ to: await guard.getAddress(), value: ethers.parseEther("10") });
      const execTx = await guard.connect(agentOwner).executeWithGuardrails(agent.address, target.address, ethers.parseEther("0.1"), "0x");
      expect((await execTx.wait()).status).to.equal(1);
    });

    it("should reject tx exceeding per-tx limit", async function () {
      await guard.connect(owner).createPolicy(ethers.parseEther("0.1"), ethers.parseEther("1"), 86400, 0, 0, 0, []);
      await guard.connect(owner).setPolicyForAgent(agent.address, 1n);
      await expect(
        guard.connect(agentOwner).executeWithGuardrails(agent.address, target.address, ethers.parseEther("1"), "0x")
      ).to.be.revertedWithCustomError(guard, "SpendLimitExceeded");
    });

    it("should pause and unpause agent", async function () {
      await guard.connect(owner).createPolicy(ethers.parseEther("100"), ethers.parseEther("1000"), 86400, 0, 0, 0, []);
      await guard.connect(owner).setPolicyForAgent(agent.address, 1n);
      await guard.connect(owner).pauseAgent(agent.address);
      await expect(
        guard.connect(agentOwner).executeWithGuardrails(agent.address, target.address, 1, "0x")
      ).to.be.revertedWithCustomError(guard, "AgentIsPaused");
      await guard.connect(owner).unpauseAgent(agent.address);
      await owner.sendTransaction({ to: await guard.getAddress(), value: ethers.parseEther("1") });
      const tx = await guard.connect(agentOwner).executeWithGuardrails(agent.address, target.address, 1, "0x");
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should enforce whitelist", async function () {
      await guard.connect(owner).createPolicy(ethers.parseEther("100"), ethers.parseEther("1000"), 86400, 0, 0, 0, [target.address]);
      await guard.connect(owner).setPolicyForAgent(agent.address, 1n);
      await owner.sendTransaction({ to: await guard.getAddress(), value: ethers.parseEther("1") });
      const tx = await guard.connect(agentOwner).executeWithGuardrails(agent.address, target.address, 1, "0x");
      expect((await tx.wait()).status).to.equal(1);
      await expect(
        guard.connect(agentOwner).executeWithGuardrails(agent.address, user.address, 1, "0x")
      ).to.be.revertedWithCustomError(guard, "NotWhitelisted");
    });
  });

  describe("P256PolicyAuth", function () {
    it("should register and remove a passkey", async function () {
      const credentialId = ethers.keccak256(ethers.toUtf8Bytes("cred-1"));
      const x = ethers.keccak256(ethers.toUtf8Bytes("x-coord"));
      const y = ethers.keccak256(ethers.toUtf8Bytes("y-coord"));
      await p256.connect(user).registerPasskey(credentialId, x, y);
      const passkeys = await p256.getUserPasskeys(user.address);
      expect(passkeys.length).to.equal(1);
      await p256.connect(user).removePasskey(credentialId);
    });
  });
});
