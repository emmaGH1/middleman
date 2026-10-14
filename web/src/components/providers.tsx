"use client";

import { useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { chain } from "@/config/contracts";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const config = createConfig({
  chains: [chain],
  ssr: true,
  connectors: connectorsForWallets([{ groupName: "Your wallet", wallets: projectId ? [injectedWallet, walletConnectWallet] : [injectedWallet] }], {
    appName: "Middleman", projectId: projectId || "injected-only",
  }),
  transports: { [chain.id]: http() },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } }));
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}>
    <RainbowKitProvider theme={darkTheme({ accentColor: "#fff", accentColorForeground: "#000", borderRadius: "none", fontStack: "system" })} modalSize="compact">
      {children}
    </RainbowKitProvider>
  </QueryClientProvider></WagmiProvider>;
}
