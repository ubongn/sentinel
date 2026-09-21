import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WalletProvider } from "./context/WalletContext";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
);
