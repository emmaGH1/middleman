import type { Address } from "viem";

export async function assertSigner(
  wallet: { getChainId(): Promise<number>; getAddresses(): Promise<readonly Address[]> },
  client: { getChainId(): Promise<number> },
  chainId: number,
  address: Address,
) {
  const [walletChain, rpcChain, accounts] = await Promise.all([wallet.getChainId(), client.getChainId(), wallet.getAddresses()]);
  if (walletChain !== chainId || rpcChain !== chainId) throw new Error("Wallet or RPC network changed. Switch to the configured network and reconcile.");
  if (accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed. Reconnect and try again.");
}

export function assertSuccessfulReceipt(receipt: { status: string }) {
  if (receipt.status !== "success") throw new Error("Transaction reverted onchain. No action completed; gas may have been spent.");
}
