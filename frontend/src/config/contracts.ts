// Contract addresses on Monad Testnet — deployed 2026-09-21
export const CONTRACTS = {
  SentinelRegistry: import.meta.env.VITE_REGISTRY_ADDRESS || "0xa49037d8e8c3d8d32f524bc70dd790ed1cee687d",
  SentinelGuard:    import.meta.env.VITE_GUARD_ADDRESS    || "0x1b86A7dEe864f859127bE6Ff93DeA0342824d575",
  P256PolicyAuth:   import.meta.env.VITE_P256_ADDRESS      || "0x25375F29fC151f9A3fb0DF494C1c3a9603CB09D2",
};

export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC = "https://testnet-rpc.monad.xyz";
export const MONAD_EXPLORER = "https://monad-testnet.socialscan.io";

export const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";
