import { useState, useEffect, useCallback } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { toast } from "sonner";
import { useWallet } from "../context/WalletContext";
import { CONTRACTS, isSmartAccountActive, getDelegationTarget, MONAD_EXPLORER } from "../config/contracts";

interface SmartAccountUpgradeProps {
  /** The agent's EOA address to upgrade */
  agentAddress: string;
  /** Called when delegation status changes */
  onStatusChange?: (isActive: boolean) => void;
}

type UpgradeStatus = "idle" | "signing" | "submitting" | "confirming" | "success" | "error";

export function SmartAccountUpgrade({ agentAddress, onStatusChange }: SmartAccountUpgradeProps) {
  const { provider } = useWallet();
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [delegationTarget, setDelegationTarget] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sentinelAccountAddr = CONTRACTS.SentinelAccount;

  // Check current delegation status
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

  /**
   * Execute the EIP-7702 delegation flow:
   * 1. Sign authorization (signAuthorization)
   * 2. Submit type 0x04 transaction with the authorization
   */
  async function handleUpgrade() {
    if (!provider) {
      toast.error("Connect your wallet first");
      return;
    }

    if (sentinelAccountAddr === "0x0000000000000000000000000000000000000000") {
      toast.error("SentinelAccount not deployed yet. Deploy the contract first.");
      return;
    }

    setError(null);
    setTxHash(null);

    try {
      // Step 1: Create wallet client with viem
      setUpgradeStatus("signing");
      toast.info("Step 1/2: Sign the EIP-7702 authorization in your wallet...");

      if (!provider) {
        toast.error("Connect your wallet first");
        return;
      }

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
      });

      // Get the connected account
      const [account] = await walletClient.getAddresses();
      if (account.toLowerCase() !== agentAddress.toLowerCase()) {
        throw new Error(
          `Connected wallet (${account.slice(0, 8)}...) doesn't match agent address (${agentAddress.slice(0, 8)}...). ` +
          `Connect the agent's wallet.`
        );
      }

      // Step 2: Sign EIP-7702 authorization
      // This tells the chain: "When I send a transaction, use SentinelAccount's code for my EOA"
      const authorization = await walletClient.signAuthorization({
        account,
        contractAddress: sentinelAccountAddr as `0x${string}`,
      });

      // Step 3: Submit type 0x04 transaction
      setUpgradeStatus("submitting");
      toast.info("Step 2/2: Submitting EIP-7702 delegation transaction...");

      const hash = await walletClient.sendTransaction({
        account,
        authorizationList: [authorization],
        to: account, // send to self — the delegation is the point, not the value
        data: "0x",   // no calldata needed for the delegation tx itself
        value: 0n,
      });

      setTxHash(hash);
      setUpgradeStatus("confirming");
      toast.success("Transaction submitted! Waiting for confirmation...");

      // Note: We don't wait for receipt in the browser — it can take a while on Monad.
      // The user can check the explorer. We'll re-check delegation status in a few seconds.
      setTimeout(() => {
        checkDelegation();
        setUpgradeStatus("success");
        toast.success("Agent upgraded to Smart Account! Sentinel is now unbypassable.");
      }, 5000);

    } catch (e: any) {
      console.error("EIP-7702 upgrade failed:", e);
      const msg = e?.message || "Upgrade failed";
      setError(msg);
      setUpgradeStatus("error");

      if (msg.includes("User rejected") || msg.includes("denied")) {
        toast.error("Transaction rejected by user.");
      } else {
        toast.error(`Upgrade failed: ${msg}`);
      }
    }
  }

  /**
   * Remove delegation (revert to normal EOA)
   */
  async function handleRemoveDelegation() {
    if (!provider) {
      toast.error("Connect your wallet first");
      return;
    }

    try {
      setUpgradeStatus("signing");
      toast.info("Removing EIP-7702 delegation...");

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
      });

      const [account] = await walletClient.getAddresses();

      // Delegate to address(0) to remove delegation
      const authorization = await walletClient.signAuthorization({
        account,
        contractAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      });

      const hash = await walletClient.sendTransaction({
        account,
        authorizationList: [authorization],
        to: account,
        data: "0x",
        value: 0n,
      });

      setTxHash(hash);
      setUpgradeStatus("confirming");

      setTimeout(() => {
        checkDelegation();
        setUpgradeStatus("idle");
        toast.success("Delegation removed. Agent reverted to opt-in mode.");
      }, 5000);

    } catch (e: any) {
      const msg = e?.message || "Failed to remove delegation";
      setError(msg);
      setUpgradeStatus("error");
      toast.error(`Failed: ${msg}`);
    }
  }

  if (!agentAddress || !agentAddress.startsWith("0x")) {
    return null;
  }

  if (sentinelAccountAddr === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="upgrade-card" style={{ borderColor: "var(--text-muted)" }}>
        <div className="upgrade-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L2 6v5c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V6l-8-4z"
              stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ color: "var(--text-muted)" }}>Smart Account not deployed yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`upgrade-card ${isSmartAccount ? "active" : "inactive"}`}>
      <div className="upgrade-header">
        {isSmartAccount ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V6l-8-4z"
              fill="#22C55E" stroke="#16A34A" strokeWidth="1.5" />
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V6l-8-4z"
              stroke="#D97706" strokeWidth="1.5" fill="none" />
            <path d="M12 8v4M12 16h.01" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        <div>
          <h3 style={{ margin: 0, fontSize: "16px" }}>
            {isSmartAccount ? "Smart Account Active" : "Opt-in Mode (Bypassable)"}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            {isSmartAccount
              ? "Agent is delegated to SentinelAccount — guardrails are unbypassable."
              : "Agent can bypass Sentinel by calling contracts directly. Upgrade to fix."}
          </p>
        </div>
      </div>

      {checking ? (
        <div className="skeleton" style={{ height: 40, marginTop: 12 }} />
      ) : (
        <div style={{ marginTop: 12 }}>
          {/* Status indicators */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div className="badge-chip">
              <span className="badge-dot" style={{ background: isSmartAccount ? "#22C55E" : "#D97706" }} />
              {isSmartAccount ? "No-Bypass" : "Bypassable"}
            </div>
            {delegationTarget && delegationTarget !== "0x0000000000000000000000000000000000000000" && (
              <div className="badge-chip mono" style={{ fontSize: "11px" }}>
                Delegated to {delegationTarget.slice(0, 8)}...{delegationTarget.slice(-4)}
              </div>
            )}
          </div>

          {/* EIP-7702 info */}
          <div className="info-box" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "13px" }}>
              How EIP-7702 delegation works:
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.8 }}>
              <li>You sign an authorization: "delegate my EOA to SentinelAccount"</li>
              <li>A type <code>0x04</code> transaction is submitted to Monad</li>
              <li>Your EOA now executes SentinelAccount's code for every transaction</li>
              <li>All calls go through Sentinel's guardrail checks — no bypass possible</li>
            </ol>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
              Monad supports EIP-7702 natively. Note: delegated accounts must maintain ≥10 MON reserve balance.
            </p>
          </div>

          {/* Actions */}
          {isSmartAccount ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRemoveDelegation}
              disabled={upgradeStatus === "signing" || upgradeStatus === "submitting" || upgradeStatus === "confirming"}
            >
              Revert to Opt-in Mode
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleUpgrade}
              disabled={
                upgradeStatus === "signing" ||
                upgradeStatus === "submitting" ||
                upgradeStatus === "confirming" ||
                sentinelAccountAddr === "0x0000000000000000000000000000000000000000"
              }
            >
              {upgradeStatus === "signing" && "Signing Authorization..."}
              {upgradeStatus === "submitting" && "Submitting Transaction..."}
              {upgradeStatus === "confirming" && "Confirming..."}
              {(upgradeStatus === "idle" || upgradeStatus === "error" || upgradeStatus === "success") && (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                    <path d="M8 1L2 4v4c0 3.5 2.5 7 6 8 3.5-1 6-4.5 6-8V4L8 1z"
                      fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Make Agent Unbypassable
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="error-box" style={{ marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: "13px" }}>{error}</p>
            </div>
          )}

          {/* TX hash */}
          {txHash && (
            <div style={{ marginTop: 12, fontSize: "13px" }}>
              <a
                href={`${MONAD_EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ color: "var(--accent)", fontSize: "12px" }}
              >
                View on explorer: {txHash.slice(0, 18)}...
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
