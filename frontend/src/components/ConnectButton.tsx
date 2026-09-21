import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";

interface WalletProviderInfo {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: any;
}

/**
 * Wallet Connect Button with EIP-6963 multi-wallet detection.
 * Auto-reconnects on page refresh using saved wallet RDNS.
 */
export function ConnectButton() {
  const { address, setWallet, disconnect, savedRdns } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState<WalletProviderInfo[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [reconnectAttempted, setReconnectAttempted] = useState(false);

  // EIP-6963: detect all installed wallets
  useEffect(() => {
    const discovered: WalletProviderInfo[] = [];

    function onAnnouncement(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail?.info?.rdns && !discovered.some(w => w.info.rdns === detail.info.rdns)) {
        discovered.push(detail);
        setWallets([...discovered]);
      }
    }

    window.addEventListener("eip6963:announceProvider", onAnnouncement as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnouncement as EventListener);
    };
  }, []);

  // Auto-reconnect on page refresh: find saved wallet and reconnect
  useEffect(() => {
    if (address || reconnectAttempted || !savedRdns || wallets.length === 0) return;
    setReconnectAttempted(true);

    const saved = wallets.find(w => w.info.rdns === savedRdns);
    if (saved) {
      // Try silent reconnect (eth_accounts — no popup)
      saved.provider.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts?.length > 0) {
          setWallet(saved.provider, accounts[0], savedRdns);
        }
      }).catch(() => {});
    }
  }, [wallets, savedRdns, address, reconnectAttempted, setWallet]);

  // Fallback: check window.ethereum if no EIP-6963 wallets found
  useEffect(() => {
    if (address || reconnectAttempted || wallets.length > 0) return;
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    setReconnectAttempted(true);

    (window as any).ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts?.length > 0) {
        setWallet((window as any).ethereum, accounts[0]);
      }
    }).catch(() => {});
  }, [address, reconnectAttempted, wallets, setWallet]);

  const switchToMonad = useCallback(async (provider: any) => {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x279F" }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x279F",
            chainName: "Monad Testnet",
            nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
            rpcUrls: ["https://testnet-rpc.monad.xyz"],
            blockExplorerUrls: ["https://monad-testnet.socialscan.io"],
          }],
        });
      }
    }
  }, []);

  async function connectWallet(wallet: WalletProviderInfo) {
    setConnecting(true);
    setShowSelector(false);
    try {
      await switchToMonad(wallet.provider);
      const accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
      if (accounts?.length > 0) {
        setWallet(wallet.provider, accounts[0], wallet.info.rdns);
      }
    } catch (err: any) {
      console.error("Connection failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  async function connectFallback() {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("No wallet detected. Install MetaMask, OKX, or Coinbase Wallet.");
      return;
    }
    setConnecting(true);
    setShowSelector(false);
    try {
      await switchToMonad((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      if (accounts?.length > 0) {
        setWallet((window as any).ethereum, accounts[0]);
      }
    } catch (err: any) {
      console.error("Connection failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  // Connected state
  if (address) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div className="wallet-connected">
          <span className="wallet-dot" />
          <span className="wallet-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  // Wallet selector dropdown
  return (
    <div style={{ position: "relative" }}>
      <button
        className="connect-btn"
        onClick={() => wallets.length > 0 ? setShowSelector(!showSelector) : connectFallback()}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>

      {showSelector && (
        <div className="wallet-selector">
          {wallets.map((wallet) => (
            <button
              key={wallet.info.uuid}
              className="wallet-option"
              onClick={() => connectWallet(wallet)}
            >
              {wallet.info.icon ? (
                <img src={wallet.info.icon} alt={wallet.info.name} width={24} height={24} />
              ) : (
                <span className="wallet-icon-placeholder" />
              )}
              <span>{wallet.info.name}</span>
            </button>
          ))}
          <button className="wallet-option wallet-option-fallback" onClick={connectFallback}>
            <span className="wallet-icon-placeholder" />
            <span>Browser Wallet</span>
          </button>
        </div>
      )}
    </div>
  );
}
