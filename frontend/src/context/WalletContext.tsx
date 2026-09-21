import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WalletContextType {
  provider: any | null;
  address: string | null;
  setWallet: (provider: any, address: string) => void;
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

  const setWallet = useCallback((prov: any, addr: string) => {
    setProvider(prov);
    setAddress(addr);
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ provider, address, setWallet, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
