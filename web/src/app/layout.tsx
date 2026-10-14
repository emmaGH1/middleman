import type { Metadata } from "next";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Middleman — A spot. A backer. No leap of faith.",
  description: "An onchain agreement between the wallet with the whitelist spot and the wallet with the USDC. Middleman design preview; not yet deployed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
