import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";

const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";

export function WalletProvider({ children }: PropsWithChildren) {
  if (!DYNAMIC_ENVIRONMENT_ID) {
    // Dynamic not configured — render without provider (dev/fallback mode)
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          views: [
            {
              type: "login",
              name: "login",
              tabs: [
                {
                  label: "Email & Social",
                  type: "email-social",
                },
                {
                  label: "Wallet",
                  type: "wallet",
                },
              ],
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
