// Contract addresses on Monad Testnet — deployed 2026-09-21
export const CONTRACTS = {
  SentinelRegistry: import.meta.env.VITE_REGISTRY_ADDRESS || "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d",
  SentinelGuard:    import.meta.env.VITE_GUARD_ADDRESS    || "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575",
  P256PolicyAuth:   import.meta.env.VITE_P256_ADDRESS      || "0x25375F29fC151f9A3fb0DF494C1c3a9603CB09D2",
  SentinelAccount:  import.meta.env.VITE_ACCOUNT_ADDRESS   || "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c",
};

export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC = "https://testnet-rpc.monad.xyz";
export const MONAD_EXPLORER = "https://monad-testnet.socialscan.io";

export const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";

/**
 * EIP-7702 delegation status for an agent.
 * Returns the delegation target address (address(0) if not delegated).
 */
export async function getDelegationTarget(eoaAddress: string): Promise<string> {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const code = await provider.getCode(eoaAddress);

  // EIP-7702 delegated code: 0xef0100 + 20-byte address (46 chars with0x prefix, 44 after)
  if (!code || code.length !== 48) return ethers.ZeroAddress;
  if (!code.startsWith("0xef0100")) return ethers.ZeroAddress;

  // Extract the20-byte address from the delegation indicator
  return ethers.getAddress("0x" + code.slice(8));
}

/**
 * Check if an address is delegated to SentinelAccount.
 */
export async function isSmartAccountActive(eoaAddress: string): Promise<boolean> {
  const { ethers } = await import("ethers");
  const delegated = await getDelegationTarget(eoaAddress);
  const sentinelAddr = CONTRACTS.SentinelAccount;
  return (
    delegated.toLowerCase() !== ethers.ZeroAddress.toLowerCase() &&
    delegated.toLowerCase() === sentinelAddr.toLowerCase()
  );
}
