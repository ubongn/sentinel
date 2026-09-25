import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "sentinel_wallet_rdns";
const DISCONNECT_KEY = "sentinel_disconnected";

interface WalletContextType {
  provider: any | null;
  address: string | null;
  setWallet: (provider: any, address: string, rdns?: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  address: null,
  setWallet: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [savedRdns, setSavedRdns] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const setWallet = useCallback((prov: any, addr: string, rdns?: string) => {
    setProvider(prov);
    setAddress(addr);
    // Clear disconnect flag on manual connect
    localStorage.removeItem(DISCONNECT_KEY);
    if (rdns) {
      localStorage.setItem(STORAGE_KEY, rdns);
      setSavedRdns(rdns);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(DISCONNECT_KEY, "1");
    setSavedRdns(null);
  }, []);

  const value = { provider, address, setWallet, disconnect, savedRdns };

  return (
    <WalletContext.Provider value={value as any}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext) as WalletContextType & { savedRdns: string | null };
}

/** Check if user explicitly disconnected (prevents auto-reconnect) */
export function wasDisconnected() {
  return localStorage.getItem(DISCONNECT_KEY) === "1";
}
