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
  // Auto-dismiss after 5s
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id);
    listeners.forEach(fn => fn(toasts));
  }, 5000);
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
 * Parse contract errors into user-friendly messages.
 */
export function parseContractError(err: any): string {
  const msg = err?.message || err?.toString() || "";

  // User rejected
  if (msg.includes("user rejected") || msg.includes("User denied") || msg.includes("ACTION_REJECTED")) {
    return "Transaction cancelled";
  }

  // Custom contract errors
  if (msg.includes("AgentAlreadyRegistered")) return "This agent is already registered";
  if (msg.includes("NotAgentOwner")) return "You don't own this agent";
  if (msg.includes("AgentNotActive")) return "This agent is paused or inactive";
  if (msg.includes("AgentAlreadyActive")) return "This agent is already active";
  if (msg.includes("PolicyNotFound")) return "This policy doesn't exist";
  if (msg.includes("CallerNotAgentOwner")) return "Only the agent owner can do this";
  if (msg.includes("TransactionBlocked")) return "This transaction was blocked by guardrails";
  if (msg.includes("CircuitBreakTriggered")) return "Circuit break triggered — agent paused";
  if (msg.includes("InsufficientBalance")) return "Insufficient MON balance";
  if (msg.includes("SpendingLimitExceeded")) return "Spending limit exceeded";
  if (msg.includes("NotWhitelisted")) return "Target address is not whitelisted";
  if (msg.includes("TimeLockNotExpired")) return "Time-lock hasn't expired yet";
  if (msg.includes("execution reverted")) return "Transaction failed — check your inputs and try again";

  // Network
  if (msg.includes("NETWORK_ERROR") || msg.includes("could not detect network")) return "Network error — make sure you're on Monad Testnet";

  return "Something went wrong. Please try again.";
}
