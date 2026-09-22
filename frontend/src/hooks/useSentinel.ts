import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, MONAD_RPC } from "../config/contracts";
import { useWallet } from "../context/WalletContext";
import { toast, parseContractError } from "../components/Toast";
import RegistryAbi from "../abi/SentinelRegistry.json";
import GuardAbi from "../abi/SentinelGuard.json";
import P256Abi from "../abi/P256PolicyAuth.json";

function getReadProvider() {
  return new ethers.JsonRpcProvider(MONAD_RPC);
}

function getContracts(signerOrProvider: ethers.Signer | ethers.Provider) {
  return {
    registry: new ethers.Contract(CONTRACTS.SentinelRegistry, RegistryAbi.abi, signerOrProvider),
    guard:    new ethers.Contract(CONTRACTS.SentinelGuard, GuardAbi.abi, signerOrProvider),
    p256:     new ethers.Contract(CONTRACTS.P256PolicyAuth, P256Abi.abi, signerOrProvider),
  };
}

export interface AgentInfo {
  owner: string;
  policyHash: string;
  registeredAt: bigint;
  updatedAt: bigint;
  active: boolean;
  metadata: string;
}

export interface PolicyInfo {
  owner: string;
  maxSpendPerTx: bigint;
  maxSpendPerPeriod: bigint;
  periodDuration: bigint;
  timeLockDuration: bigint;
  timeLockThreshold: bigint;
  circuitBreakThreshold: bigint;
  whitelist: string[];
  active: boolean;
}

export function useSentinel() {
  const { provider: walletProvider } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("No wallet connected — click Connect Wallet first");
    const browserProvider = new ethers.BrowserProvider(walletProvider);
    return browserProvider.getSigner();
  }, [walletProvider]);

  // ── Registry ──

  const registerAgent = useCallback(async (agentAddress: string, policyHash: string, metadata: string) => {
    setLoading(true); setError(null);
    try {
      const signer = await getSigner();
      const { registry } = getContracts(signer);
      const tx = await registry.registerAgent(agentAddress, policyHash, metadata);
      await tx.wait();
      return tx.hash;
    } catch (e: any) { const msg = parseContractError(e); setError(msg); toast.error(msg); throw e; } finally { setLoading(false); }
  }, [getSigner]);

  const getAgent = useCallback(async (address: string): Promise<AgentInfo> => {
    const provider = getReadProvider();
    const { registry } = getContracts(provider);
    return registry.getAgent(address);
  }, []);

  const getAllAgents = useCallback(async (offset = 0, limit = 50): Promise<string[]> => {
    const provider = getReadProvider();
    const { registry } = getContracts(provider);
    return registry.getAgentsPaginated(offset, limit);
  }, []);

  const getAgentCount = useCallback(async (): Promise<bigint> => {
    const provider = getReadProvider();
    const { registry } = getContracts(provider);
    return registry.getAgentCount();
  }, []);

  // ── Guard ──

  const createPolicy = useCallback(async (
    maxSpendPerTx: string,
    maxSpendPerPeriod: string,
    periodDuration: number,
    timeLockDuration: number,
    timeLockThreshold: string,
    circuitBreakThreshold: string,
    whitelist: string[]
  ) => {
    setLoading(true); setError(null);
    try {
      const signer = await getSigner();
      const { guard } = getContracts(signer);
      const tx = await guard.createPolicy(
        ethers.parseEther(maxSpendPerTx),
        ethers.parseEther(maxSpendPerPeriod),
        periodDuration,
        timeLockDuration,
        ethers.parseEther(timeLockThreshold),
        ethers.parseEther(circuitBreakThreshold),
        whitelist
      );
      const receipt = await tx.wait();
      // Parse PolicyCreated event for policyId
      const iface = guard.interface;
      let policyId = 0n;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === "PolicyCreated") { policyId = parsed.args[0]; break; }
        } catch {}
      }
      return { txHash: tx.hash, policyId };
    } catch (e: any) { const msg = parseContractError(e); setError(msg); toast.error(msg); throw e; } finally { setLoading(false); }
  }, [getSigner]);

  const setPolicyForAgent = useCallback(async (agentAddress: string, policyId: bigint) => {
    setLoading(true); setError(null);
    try {
      const signer = await getSigner();
      const { guard } = getContracts(signer);
      const tx = await guard.setPolicyForAgent(agentAddress, policyId);
      await tx.wait();
      return tx.hash;
    } catch (e: any) { const msg = parseContractError(e); setError(msg); toast.error(msg); throw e; } finally { setLoading(false); }
  }, [getSigner]);

  const getPolicy = useCallback(async (policyId: bigint): Promise<PolicyInfo> => {
    const provider = getReadProvider();
    const { guard } = getContracts(provider);
    return guard.getPolicy(policyId);
  }, []);

  const pauseAgent = useCallback(async (agentAddress: string) => {
    setLoading(true); setError(null);
    try {
      const signer = await getSigner();
      const { guard } = getContracts(signer);
      const tx = await guard.pauseAgent(agentAddress);
      await tx.wait();
      return tx.hash;
    } catch (e: any) { const msg = parseContractError(e); setError(msg); toast.error(msg); throw e; } finally { setLoading(false); }
  }, [getSigner]);

  const unpauseAgent = useCallback(async (agentAddress: string) => {
    setLoading(true); setError(null);
    try {
      const signer = await getSigner();
      const { guard } = getContracts(signer);
      const tx = await guard.unpauseAgent(agentAddress);
      await tx.wait();
      return tx.hash;
    } catch (e: any) { const msg = parseContractError(e); setError(msg); toast.error(msg); throw e; } finally { setLoading(false); }
  }, [getSigner]);

  const canExecute = useCallback(async (agent: string, to: string, value: string) => {
    const provider = getReadProvider();
    const { guard } = getContracts(provider);
    return guard.canExecute(agent, to, ethers.parseEther(value));
  }, []);

  // ── Events ──

  const getRecentEvents = useCallback(async (fromBlock = -1000) => {
    const provider = getReadProvider();
    const { guard, registry } = getContracts(provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock + fromBlock);

    const [txEvents, agentEvents, pauseEvents] = await Promise.all([
      guard.queryFilter(guard.filters.TransactionExecuted(), startBlock, currentBlock),
      registry.queryFilter(registry.filters.AgentRegistered(), startBlock, currentBlock),
      guard.queryFilter(guard.filters.AgentPaused(), startBlock, currentBlock),
    ]);

    const allEvents = [...txEvents, ...agentEvents, ...pauseEvents]
      .sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0))
      .slice(0, 50);

    return allEvents;
  }, []);

  return {
    loading, error,
    registerAgent, getAgent, getAllAgents, getAgentCount,
    createPolicy, setPolicyForAgent, getPolicy, pauseAgent, unpauseAgent,
    canExecute, getRecentEvents,
  };
}
