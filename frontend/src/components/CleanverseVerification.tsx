import { useState } from "react";

interface CleanverseVerificationProps {
  walletAddress: string;
  onVerified: (cvi: number) => void;
}

/**
 * Cleanverse Identity Verification component.
 * Gates agent registration behind Cleanverse CVI (Cleanverse Verification Index).
 * In production, this would call the Cleanverse API to verify identity.
 */
export function CleanverseVerification({ walletAddress, onVerified }: CleanverseVerificationProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "verified" | "failed">("idle");
  const [cvi, setCvi] = useState<number | null>(null);

  async function verifyIdentity() {
    setStatus("checking");
    try {
      // In production: call Cleanverse API
      // const response = await fetch(`https://api.cleanverse.io/v1/verify/${walletAddress}`);
      // const data = await response.json();

      // Simulated verification for demo
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate: addresses ending in even hex digit pass
      const lastChar = parseInt(walletAddress.slice(-1), 16);
      if (lastChar % 2 === 0) {
        const score = 75 + Math.floor(Math.random() * 25); // 75-99
        setCvi(score);
        setStatus("verified");
        onVerified(score);
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="cleanverse-verify">
      <div className="cv-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
        </svg>
        <span>Cleanverse Identity Verification</span>
      </div>

      <p className="cv-desc">
        Agent registration requires a Cleanverse CVI (Cleanverse Verification Index) to ensure
        responsible agent deployment. Verified identities receive a score from 0-100.
      </p>

      {status === "idle" && (
        <button onClick={verifyIdentity} className="btn btn-primary">
          Verify Identity
        </button>
      )}

      {status === "checking" && (
        <div className="cv-status">
          <div className="spinner" />
          <span>Verifying identity with Cleanverse...</span>
        </div>
      )}

      {status === "verified" && cvi !== null && (
        <div className="cv-verified">
          <div className="cv-score">
            <div className="cv-score-ring">
              <span className="cv-score-value">{cvi}</span>
            </div>
            <span className="cv-score-label">CVI Score</span>
          </div>
          <div className="cv-details">
            <div className="cv-detail-row">
              <span>Wallet</span>
              <span className="mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}</span>
            </div>
            <div className="cv-detail-row">
              <span>Status</span>
              <span className="cv-pass">Verified</span>
            </div>
            <div className="cv-detail-row">
              <span>Agent Registration</span>
              <span className="cv-pass">Eligible</span>
            </div>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="cv-failed">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <p className="cv-fail-title">Verification Failed</p>
            <p className="cv-fail-desc">
              Your wallet address could not be verified through Cleanverse.
              Please ensure you have completed identity verification at cleanverse.io.
            </p>
            <button onClick={verifyIdentity} className="btn btn-secondary btn-sm" style={{ marginTop: "12px" }}>
              Retry Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
