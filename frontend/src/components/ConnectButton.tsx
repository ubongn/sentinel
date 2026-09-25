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

  // Popular wallets with install links
  const popularWallets = [
    { name: "MetaMask", url: "https://metamask.io/download/", icon: "🦊" },
    { name: "OKX Wallet", url: "https://www.okx.com/web3", icon: "⭕" },
    { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet", icon: "🔵" },
    { name: "Rabby", url: "https://rabby.io/", icon: "🐰" },
  ];

  // No wallets detected via EIP-6963 — show install suggestions
  if (wallets.length === 0) {
    return (
      <div style={{ position: "relative" }}>
        <button
          className="connect-btn"
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).ethereum) {
              connectFallback();
            } else {
              setShowSelector(!showSelector);
            }
          }}
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
            <div className="wallet-selector" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1000, marginTop: 4, minWidth: 240 }}>
              <div style={{ padding: "8px 12px", fontSize: 12, opacity: 0.6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Install a Wallet
              </div>
              {popularWallets.map((wallet) => (
                <a
                  key={wallet.name}
                  href={wallet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-option"
                  onClick={() => setShowSelector(false)}
                  style={{ textDecoration: "none" }}
                >
                  <span style={{ fontSize: 20 }}>{wallet.icon}</span>
                  <span>{wallet.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>Install →</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
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
          <div className="wallet-selector" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1000, marginTop: 4, minWidth: 220 }}>
            {/* Detected wallets */}
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

            {/* Install suggestions for wallets not detected */}
            {(() => {
              const missing = popularWallets.filter(
                w => !wallets.some(d => d.info.name.toLowerCase().includes(w.name.toLowerCase().split(" ")[0]))
              );
              if (missing.length === 0) return null;
              return (
                <>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />
                  <div style={{ padding: "6px 12px", fontSize: 11, opacity: 0.5, fontWeight: 600 }}>
                    More Wallets
                  </div>
                  {missing.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wallet-option"
                      onClick={() => setShowSelector(false)}
                      style={{ textDecoration: "none", opacity: 0.7 }}
                    >
                      <span style={{ fontSize: 18 }}>{wallet.icon}</span>
                      <span>{wallet.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>Install</span>
                    </a>
                  ))}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}