import { useState, useEffect, useCallback } from "react";
import { CONTRACTS, isSmartAccountActive, getDelegationTarget } from "../config/contracts";

interface SmartAccountUpgradeProps {
  agentAddress: string;
  onStatusChange?: (isActive: boolean) => void;
}

export function SmartAccountUpgrade({ agentAddress, onStatusChange }: SmartAccountUpgradeProps) {
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [delegationTarget, setDelegationTarget] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

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
          </div>
        ) : (
          <div className="delegation-inactive">
            <div className="status-badge warning">
              <span className="warning-icon">⚠️</span>
              Opt-in Mode (Bypassable)
            </div>
            <p className="status-description">
              Agent can bypass Sentinel by calling contracts directly. Upgrade to fix.
            </p>

            <div className="upgrade-instructions">
              <h4>How to upgrade to Smart Account:</h4>
              <ol>
                <li>Open your wallet (OKX/MetaMask)</li>
                <li>Go to <strong>Settings → Smart Account</strong> or <strong>Account Abstraction</strong></li>
                <li>Select <strong>"Delegate to contract"</strong></li>
                <li>Enter SentinelAccount address:
                  <code className="contract-address">{sentinelAccountAddr}</code>
                </li>
                <li>Confirm the delegation transaction</li>
              </ol>

              <div className="upgrade-note">
                <strong>Why?</strong> Once delegated, your agent's EOA runs SentinelAccount's code — every transaction goes through guardrail checks automatically. The agent cannot bypass Sentinel.
              </div>

              <div className="monad-note">
                <strong>Monad EIP-7702:</strong> Delegated accounts must maintain ≥10 MON reserve balance.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}