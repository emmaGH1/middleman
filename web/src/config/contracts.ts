import { defineChain, getAddress, isAddress, zeroAddress, type Chain } from "viem";

const local = process.env.NEXT_PUBLIC_LOCAL_CHAIN === "1";
const mainnet = process.env.NEXT_PUBLIC_ARC_CHAIN_ID === "5042";
export const chain: Chain = defineChain({
  id: local ? 31337 : mainnet ? 5042 : 5042002,
  name: local ? "Local Anvil (not Arc)" : mainnet ? "Arc Mainnet" : "Arc Testnet",
  nativeCurrency: { name: local ? "Test ETH" : "USDC", symbol: local ? "ETH" : "USDC", decimals: 18 },
  rpcUrls: { default: { http: [local ? "http://127.0.0.1:8545" : mainnet ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.io"] } },
  ...(!local ? { blockExplorers: { default: { name: "Arc Explorer", url: mainnet ? "https://explorer.arc.io" : "https://explorer.testnet.arc.io" } } } : {}),
  testnet: !mainnet || local,
});

function address(value: string | undefined) {
  return value && isAddress(value) && value !== zeroAddress ? getAddress(value) : undefined;
}

export const escrowAddress = address(process.env.NEXT_PUBLIC_MIDDLEMAN_ADDRESS);
export const usdcAddress = local ? address(process.env.NEXT_PUBLIC_LOCAL_USDC_ADDRESS) : getAddress("0x3600000000000000000000000000000000000000");
const block = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK;
export const deploymentBlock = block && /^\d+$/.test(block) ? BigInt(block) : undefined;
export const configured = !!escrowAddress && !!usdcAddress && deploymentBlock !== undefined;
export function explorerPath(path: string) {
  const explorer = chain.blockExplorers?.default.url;
  return explorer ? `${explorer}/${path}` : undefined;
}
