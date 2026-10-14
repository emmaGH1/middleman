import type { NextConfig } from "next";

if (process.env.VERCEL && (process.env.NEXT_PUBLIC_LOCAL_CHAIN === "1" || process.env.NEXT_PUBLIC_DEMO_CONNECTOR === "1")) {
  throw new Error("Local/demo wallet mode must never be deployed to Vercel.");
}

const nextConfig: NextConfig = { devIndicators: false };
export default nextConfig;
