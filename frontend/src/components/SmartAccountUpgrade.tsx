import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { useWallet } from "../context/WalletContext";
import { CONTRACTS, isSmartAccountActive, getDelegationTarget } from "../config/contracts";

interface SmartAccountUpgradeProps {
  agentAddress: string;
  onStatusChange?: (isActive: boolean) => void;
}

type UpgradeStatus = "idle" | "signing" | "submitting" | "confirming" | "success" | "error";

export function SmartAccountUpgrade({ agentAddress, onStatusChange }: SmartAccountUpgradeProps) {
  const { provider: walletProvider } = useWallet();
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [delegationTarget, setDelegationTarget] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const sentinelAccountAddr = CONTRACTS.SentinelAccount;

  const checkDelegation = useCallback(async () => {
    if (!agentAddress || !agentAddress.startsWith("0x")) return;
    setChecking(true);
    try {
      const [active, target] = await Promise.all([
        isSmartAccountActive(agentAddress),
        getDelegationTarget(agentAddress),
      ]);
      setIsSmartAccount(active);
      setDelegationTarget(target);
      onStatusChange?.(active);
    } catch (e) {
      console.error("Failed to check delegation:", e);
    } finally {
      setChecking(false);
    }
  }, [agentAddress, onStatusChange]);

  useEffect(() => {
    checkDelegation();
  }, [checkDelegation]);

  async function handleUpgrade() {
    if (!walletProvider) {
      toast.error("Connect your wallet first");
      return;
    }

    if (sentinelAccountAddr === "0x0000000000000000000000000000000000000000") {
      toast.error("SentinelAccount not deployed yet.");
      return;
    }

    setError(null);

    try {
      setUpgradeStatus("signing");
      toast.info("Step 1/2: Sign the EIP-7702 authorization...");

      const browserProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();

      if (signerAddress.toLowerCase() !== agentAddress.toLowerCase()) {
        throw new Error(
          `Connected wallet (${signerAddress.slice(0, 8)}...) doesn't match agent address (${agentAddress.slice(0, 8)}...). Connect the agent's wallet.`
        );
      }

      const nonce = await browserProvider.getTransactionCount(signerAddress);
      const chainId = (await browserProvider.getNetwork()).chainId;

      // Try eth_signAuthorization first (wallets that support EIP-7702 natively)
      try {
        const authorization = await walletProvider.request({
          method: "eth_signAuthorization",
          params: [signerAddress, sentinelAccountAddr, chainId.toString(16), nonce.toString(16)],
        });

        setUpgradeStatus("submitting");
        toast.info("Step 2/2: Submitting delegation transaction...");

        await walletProvider.request({
          method: "eth_sendTransaction",
          params: [{
            from: signerAddress,
            to: signerAddress,
            data: "0x",
            value: "0x0",
            authorizationList: [authorization],
            type: "0x04",
          }],
        });

        setUpgradeStatus("confirming");
        toast.success("Transaction submitted! Waiting for confirmation...");

        setTimeout(() => {
          checkDelegation();
          setUpgradeStatus("success");
          toast.success("Smart Account activated! Agent is now unbypassable.");
        }, 5000);

      } catch (signError: any) {
        // Fallback: sign authorization hash with personal_sign
        if (signError.message?.includes("Method not found") || signError.code === -32601) {
          toast.info("Using alternative signing method...");

          const authHash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256"],
            [chainId, sentinelAccountAddr, nonce]
          );

          const signature = await signer.signMessage(ethers.getBytes(authHash));
          const sig = ethers.Signature.from(signature);

          setUpgradeStatus("submitting");
          toast.info("Step 2/2: Submitting delegation transaction...");

          await walletProvider.request({
            method: "eth_sendTransaction",
            params: [{
              from: signerAddress,
              to: signerAddress,
              data: "0x",
              value: "0x0",
              authorizationList: [{
                chainId: chainId.toString(16),
                address: sentinelAccountAddr,
                nonce: nonce.toString(16),
                yParity: sig.v === 27 ? "0x0" : "0x1",
                r: sig.r,
                s: sig.s,
              }],
              type: "0x04",
            }],
          });

          setUpgradeStatus("confirming");
          toast.success("Transaction submitted! Waiting for confirmation...");

          setTimeout(() => {
            checkDelegation();
            setUpgradeStatus("success");
            toast.success("Smart Account activated! Agent is now unbypassable.");
          }, 5000);
        } else {
          throw signError;
        }
      }

    } catch (e: any) {
      console.error("Upgrade failed:", e);
      setError(e.message || "Upgrade failed");
      setUpgradeStatus("error");
      toast.error(e.message || "Upgrade failed");
    }
  }

  async function handleRemoveDelegation() {
    if (!walletProvider) {
      toast.error("Connect your wallet first");
      return;
    }

    try {
      setUpgradeStatus("signing");
      toast.info("Removing EIP-7702 delegation...");

      const browserProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();

      const nonce = await browserProvider.getTransactionCount(signerAddress);
      const chainId = (await browserProvider.getNetwork()).chainId;

      try {
        const authorization = await walletProvider.request({
          method: "eth_signAuthorization",
          params: [signerAddress, ethers.ZeroAddress, chainId.toString(16), nonce.toString(16)],
        });

        setUpgradeStatus("submitting");

        await walletProvider.request({
          method: "eth_sendTransaction",
          params: [{
            from: signerAddress,
            to: signerAddress,
            data: "0x",
            value: "0x0",
            authorizationList: [authorization],
            type: "0x04",
          }],
        });

        setUpgradeStatus("confirming");

        setTimeout(() => {
          checkDelegation();
          setUpgradeStatus("idle");
          toast.success("Delegation removed. Agent reverted to opt-in mode.");
        }, 5000);

      } catch (signError: any) {
        if (signError.message?.includes("Method not found") || signError.code === -32601) {
          toast.info("Using alternative method...");

          const authHash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256"],
            [chainId, ethers.ZeroAddress, nonce]
          );

          const signature = await signer.signMessage(ethers.getBytes(authHash));
          const sig = ethers.Signature.from(signature);

          setUpgradeStatus("submitting");

          await walletProvider.request({
            method: "eth_sendTransaction",
            params: [{
              from: signerAddress,
              to: signerAddress,
              data: "0x",
              value: "0x0",
              authorizationList: [{
                chainId: chainId.toString(16),
                address: ethers.ZeroAddress,
                nonce: nonce.toString(16),
                yParity: sig.v === 27 ? "0x0" : "0x1",
                r: sig.r,
                s: sig.s,
              }],
              type: "0x04",
            }],
          });

          setUpgradeStatus("confirming");

          setTimeout(() => {
            checkDelegation();
            setUpgradeStatus("idle");
            toast.success("Delegation removed. Agent reverted to opt-in mode.");
          }, 5000);
        } else {
          throw signError;
        }
      }

    } catch (e: any) {
      console.error("Remove delegation failed:", e);
      setError(e.message || "Failed to remove delegation");
      setUpgradeStatus("error");
      toast.error(e.message || "Failed to remove delegation");
    }
  }

  if (!agentAddress || !agentAddress.startsWith("0x")) {
    return null;
  }

  return (
    <div className="smart-account-upgrade">
      <div className="upgrade-status">
        {checking ? (
          <div className="checking-delegation">
            <span className="spinner" /> Checking delegation status...
          </div>
        ) : isSmartAccount ? (
          <div className="delegation-active">
            <div className="status-badge active">
              <span className="shield-icon">🛡️</span>
              No-Bypass Active
            </div>
            <p className="status-description">
              This agent is protected by EIP-7702 delegation. All transactions go through Sentinel's guardrail checks — no bypass possible.
            </p>
            <div className="delegation-details">
              <span className="detail-label">Delegated to:</span>
              <code className="detail-value">{delegationTarget?.slice(0, 10)}...{delegationTarget?.slice(-8)}</code>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRemoveDelegation}
              disabled={upgradeStatus === "signing" || upgradeStatus === "submitting" || upgradeStatus === "confirming"}
            >
              Remove Delegation
            </button>
          </div>
        ) : (
          <div className="delegation-inactive">
            <div className="status-badge warning">
              <span className="warning-icon">⚠️</span>
              Opt-in Mode (Bypassable)
            </div>
            <p className="status-description">
              Agent can bypass Sentinel by calling contracts directly. Upgrade to make guardrails unbypassable.
            </p>

            {error && <div className="error-message">{error}</div>}

            <button
              className="btn btn-primary"
              onClick={handleUpgrade}
              disabled={upgradeStatus === "signing" || upgradeStatus === "submitting" || upgradeStatus === "confirming"}
            >
              {upgradeStatus === "signing" ? "Signing..." :
               upgradeStatus === "submitting" ? "Submitting..." :
               upgradeStatus === "confirming" ? "Confirming..." :
               "Make Agent Unbypassable"}
            </button>

            <div className="upgrade-note">
              <strong>How it works:</strong> Signs an EIP-7702 delegation authorization. Your agent's EOA will execute SentinelAccount's code — every transaction goes through guardrail checks automatically.
            </div>

            <div className="monad-note">
              <strong>Monad EIP-7702:</strong> Delegated accounts must maintain ≥10 MON reserve balance.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}