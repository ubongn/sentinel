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

    const guardAddr = await guard.getAddress();
    const registryAddr = await registry.getAddress();
    const addresses = [guardAddr, registryAddr];
    const keep = new Set([
      "TransactionExecuted",
      "TransactionRejected",
      "AgentRegistered",
      "AgentPaused",
      "TimeLockQueued",
      "PolicyCreated",
      "PolicyAssigned",
    ]);

    // eth_getLogs range caps: public Monad RPC = 100 blocks, Alchemy free
    // tier = 10. Fetch in provider-sized chunks so a range error can never
    // silently zero out the feed again (verified: public serves CORS for
    // this origin, so it is the primary log source; Alchemy stays the
    // state-read + fallback endpoint).
    const PUBLIC_RPC = "https://testnet-rpc.monad.xyz";
    let logProvider: ethers.Provider = provider;
    let chunk = 9;
    try {
      const pub = new ethers.JsonRpcProvider(PUBLIC_RPC);
      await pub.getBlockNumber();
      logProvider = pub;
      chunk = 100;
    } catch {
      /* fall back to Alchemy with 9-block chunks */
    }

    const MAX_CALLS = 60;
    const chunks: Array<[number, number]> = [];
    let to = currentBlock;
    while (to > startBlock && chunks.length < MAX_CALLS) {
      const from = Math.max(startBlock, to - chunk + 1);
      chunks.push([from, to]);
      to = from - 1;
    }

    async function fetchRange(from: number, end: number): Promise<ethers.Log[]> {
      try {
        return await logProvider.getLogs({ address: addresses, fromBlock: from, toBlock: end });
      } catch {
        // Range rejected (or endpoint degraded) → switch to Alchemy + 10-ish
        // block sub-chunks and retry this span once.
        if (logProvider !== provider) {
          logProvider = provider;
          chunk = 9;
        }
        const sub: ethers.Log[] = [];
        let s = end;
        while (s >= from) {
          const f = Math.max(from, s - 8);
          try {
            sub.push(...(await logProvider.getLogs({ address: addresses, fromBlock: f, toBlock: s })));
          } catch {
            /* skip failed sub-chunk — partial feed beats a fake one */
          }
          s = f - 1;
        }
        return sub;
      }
    }

    const logs: ethers.Log[] = [];
    const CONCURRENCY = 8;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const results = await Promise.all(
        chunks.slice(i, i + CONCURRENCY).map(([f, e]) => fetchRange(f, e))
      );
      for (const r of results) logs.push(...r);
    }

    // Parse each log with the interface of the contract that emitted it.
    const parsed: any[] = [];
    for (const log of logs) {
      try {
        const iface =
          log.address.toLowerCase() === guardAddr.toLowerCase() ? guard.interface : registry.interface;
        const p = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (p && keep.has(p.name)) {
          parsed.push({
            fragment: p.fragment,
            args: p.args,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.index,
          });
        }
      } catch {
        /* event outside our kept set (or unparseable) */
      }
    }

    parsed.sort(
      (a, b) => (b.blockNumber - a.blockNumber) || ((b.logIndex || 0) - (a.logIndex || 0))
    );
    const top = parsed.slice(0, 50);

    // Real block timestamps for the events we display (not fetch time).
    const blockNos = [...new Set(top.map((e: any) => e.blockNumber))];
    const ts = new Map<number, string>();
    await Promise.all(
      blockNos.map(async (n) => {
        try {
          const b = await provider.getBlock(n);
          if (b?.timestamp) ts.set(n, new Date(Number(b.timestamp) * 1000).toISOString());
        } catch {
          /* keep fallback timestamp */
        }
      })
    );
    for (const e of top) e.timestamp = ts.get(e.blockNumber) || new Date().toISOString();

    return top;
  }, []);

  return {
    loading, error,
    registerAgent, getAgent, getAllAgents, getAgentCount,
    createPolicy, setPolicyForAgent, getPolicy, pauseAgent, unpauseAgent,
    canExecute, getRecentEvents,
  };
}
