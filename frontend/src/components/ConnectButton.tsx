import { useState, useEffect } from "react";

/**
 * Wallet Connect Button.
 * Uses Dynamic SDK when VITE_DYNAMIC_ENVIRONMENT_ID is set.
 * Falls back to MetaMask / window.ethereum for local dev.
 */
export function ConnectButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Check if already connected
  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
      if (accounts?.length > 0) {
        setAddress(accounts[0]);
      }
    } catch { /* ignore */ }
  }

  async function connect() {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("No wallet detected. Install MetaMask or use a wallet-enabled browser.");
      return;
    }
    setConnecting(true);
    try {
      // Request Monad Testnet network switch
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x279F" }], // 10143 in hex
        });
      } catch (switchError: any) {
        // Chain not added — add it
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
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

      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      if (accounts?.length > 0) {
        setAddress(accounts[0]);
      }
    } catch (err: any) {
      console.error("Connection failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setAddress(null);
  }

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

  return (
    <button className="connect-btn" onClick={connect} disabled={connecting}>
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
