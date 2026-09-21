// Contract addresses on Monad Testnet — update after deployment
export const CONTRACTS = {
  SentinelRegistry: import.meta.env.VITE_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000",
  SentinelGuard:    import.meta.env.VITE_GUARD_ADDRESS    || "0x0000000000000000000000000000000000000000",
  P256PolicyAuth:   import.meta.env.VITE_P256_ADDRESS      || "0x0000000000000000000000000000000000000000",
};

export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC = "https://testnet-rpc.monad.xyz";
export const MONAD_EXPLORER = "https://monad-testnet.socialscan.io";

export const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";
