import { useState, useEffect, useCallback } from "react";
import { useWallet, wasDisconnected } from "../context/WalletContext";

interface WalletProviderInfo {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: any;
}

/**
 * Wallet Connect Button with EIP-6963 multi-wallet detection.
 * Works with ANY wallet — MetaMask, OKX, Coinbase, Rabby, etc.
 * Falls back to window.ethereum for wallets that don't support EIP-6963.
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

  // Auto-reconnect on page refresh (only if user didn't explicitly disconnect)
  useEffect(() => {
    if (address || reconnectAttempted || !savedRdns || wallets.length === 0) return;
    if (wasDisconnected()) return;
    setReconnectAttempted(true);

    const saved = wallets.find(w => w.info.rdns === savedRdns);
    if (saved) {
      saved.provider.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts?.length > 0) {
          setWallet(saved.provider, accounts[0], savedRdns);
        }
      }).catch(() => {});
    }
  }, [wallets, savedRdns, address, reconnectAttempted, setWallet]);

  // Fallback: window.ethereum for non-EIP-6963 wallets (only if user didn't explicitly disconnect)
  useEffect(() => {
    if (address || reconnectAttempted || wallets.length > 0) return;
    if (wasDisconnected()) return;
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
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("No wallet detected. Install MetaMask, OKX, Coinbase Wallet, or any EVM wallet.");
      return;
    }
    setConnecting(true);
    setShowSelector(false);
    try {
      await switchToMonad(eth);
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts?.length > 0) {
        setWallet(eth, accounts[0]);
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

  // No wallets detected via EIP-6963 — show single connect button
  if (wallets.length === 0) {
    return (
      <button
        className="connect-btn"
        onClick={connectFallback}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  // Wallets detected — show selector
  return (
    <div style={{ position: "relative" }}>
      <button
        className="connect-btn"
        onClick={() => setShowSelector(!showSelector)}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>

      {showSelector && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setShowSelector(false)}
          />
          <div className="wallet-selector" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1000, marginTop: 4 }}>
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
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <button className="wallet-option wallet-option-fallback" onClick={connectFallback}>
              <span className="wallet-icon-placeholder" />
              <span>Other Wallet</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}