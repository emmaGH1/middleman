import type { Metadata } from "next";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Middleman — A spot. A backer. No leap of faith.",
  description: "An onchain agreement between the wallet with a DemoPass whitelist spot and the wallet with USDC. Atomic minting into escrow; resale risk remains.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
