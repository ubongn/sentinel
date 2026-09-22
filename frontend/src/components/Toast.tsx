import { useState, useCallback, useEffect } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let nextId = 0;
let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify(message: string, type: Toast["type"] = "info") {
  const toast: Toast = { id: nextId++, message, type };
  toasts = [...toasts, toast];
  listeners.forEach(fn => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id);
    listeners.forEach(fn => fn(toasts));
  }, 6000);
}

export const toast = {
  success: (msg: string) => notify(msg, "success"),
  error: (msg: string) => notify(msg, "error"),
  info: (msg: string) => notify(msg, "info"),
};

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => { listeners = listeners.filter(fn => fn !== setItems); };
  }, []);

  const dismiss = useCallback((id: number) => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(fn => fn(toasts));
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Parse contract errors into user-friendly messages WITH next-step guidance.
 */
export function parseContractError(err: any): string {
  const msg = err?.message || err?.toString() || "";

  // User rejected
  if (msg.includes("user rejected") || msg.includes("User denied") || msg.includes("ACTION_REJECTED")) {
    return "Transaction cancelled — try again when ready";
  }

  // Agent errors
  if (msg.includes("AgentAlreadyRegistered")) return "This agent is already registered — go to the Assign tab to assign a policy";
  if (msg.includes("NotAgentOwner")) return "You don't own this agent — use the address that registered it";
  if (msg.includes("AgentNotActive")) return "This agent is paused — unpause it first from the Agents page";
  if (msg.includes("AgentAlreadyActive")) return "This agent is already active — no action needed";

  // Policy errors
  if (msg.includes("PolicyNotFound")) return "Policy not found — create a policy first from the Create Policy page";
  if (msg.includes("CallerNotAgentOwner")) return "Only the agent owner can do this — connect with the owner wallet";

  // Guardrail errors
  if (msg.includes("TransactionBlocked")) return "Blocked by guardrails — the agent exceeded its spending limit";
  if (msg.includes("CircuitBreakTriggered")) return "Circuit break triggered — agent has been paused for safety";
  if (msg.includes("InsufficientBalance")) return "Insufficient MON — get testnet tokens from the faucet";
  if (msg.includes("SpendingLimitExceeded")) return "Spending limit exceeded — increase the limit or reduce the amount";
  if (msg.includes("NotWhitelisted")) return "Address not whitelisted — add it to your policy's whitelist first";
  if (msg.includes("TimeLockNotExpired")) return "Time-lock active — wait for the lock period to expire or cancel from Dashboard";

  // Generic revert
  if (msg.includes("execution reverted")) return "Transaction failed — this action may already be done or your inputs are invalid";

  // Network
  if (msg.includes("NETWORK_ERROR") || msg.includes("could not detect network")) return "Network error — switch to Monad Testnet in your wallet";

  // No wallet
  if (msg.includes("No wallet connected")) return "Connect your wallet first — click Connect Wallet in the top right";

  return "Something went wrong — check your wallet and try again";
}
