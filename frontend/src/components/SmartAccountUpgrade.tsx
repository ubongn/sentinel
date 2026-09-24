import { useState, useEffect, useCallback } from "react";
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
      toast.info("Activating EIP-7702 Smart Account...");

      // Call the relay endpoint (configurable via env, or use Vercel serverless)
      const RELAY_URL = import.meta.env.VITE_RELAY_URL || "/api/delegate";

      const response = await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentAddress: agentAddress }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delegation failed");
      }

      setUpgradeStatus("submitting");
      toast.info("Transaction submitted! Confirming on-chain...");

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      setUpgradeStatus("confirming");
      toast.success(`Delegation TX: ${result.txHash}`);

      // Check delegation status
      checkDelegation();
      setUpgradeStatus("success");
      toast.success("Smart Account activated! Agent is now unbypassable.");

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

      // Call the relay endpoint to remove delegation
      const RELAY_URL = import.meta.env.VITE_RELAY_URL || "/api/delegate";

      const response = await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentAddress: agentAddress, remove: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to remove delegation");
      }

      setUpgradeStatus("submitting");
      toast.info("Transaction submitted! Confirming on-chain...");

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      setUpgradeStatus("confirming");
      toast.success(`Delegation removed TX: ${result.txHash}`);

      // Check delegation status
      checkDelegation();
      setUpgradeStatus("idle");
      toast.success("Delegation removed. Agent reverted to opt-in mode.");

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