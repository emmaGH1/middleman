import { formatUnits, isAddress, parseUnits, zeroAddress } from "viem";

export const statuses = ["PROPOSED", "ACTIVE", "FUNDED", "NFT LOCKED", "SOLD", "REFUNDED", "CANCELLED"] as const;
const maxAmount = (1n << 128n) - 1n;

export function usdc(value: bigint) { return formatUnits(value, 6); }
export function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
export function deadlineLabel(seconds: bigint) {
  return seconds <= 8640000000000n ? new Date(Number(seconds) * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC") : `${seconds} seconds since Unix epoch`;
}
export function parseUSDC(value: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error("Use a non-negative USDC amount with at most 6 decimal places.");
  const amount = parseUnits(value, 6);
  if (amount > maxAmount) throw new Error("Amount exceeds the contract limit.");
  return amount;
}

export function payouts(cost: bigint, collateral: bigint, price: bigint, bps: number) {
  if (cost <= 0n || cost > maxAmount || collateral < 0n || collateral > maxAmount || price <= 0n || price > maxAmount
    || !Number.isInteger(bps) || bps < 0 || bps > 10000) throw new Error("Invalid sale terms.");
  if (price + collateral < cost) throw new Error("Sale price plus collateral must cover the full mint cost.");
  const funder = cost + (price > cost ? (price - cost) * BigInt(bps) / 10000n : 0n);
  return { funder, holder: price + collateral - funder };
}

export function validateCounterparty(value: string, self: string) {
  if (!isAddress(value) || value.toLowerCase() === zeroAddress || value.toLowerCase() === self.toLowerCase()) {
    throw new Error("Enter a different, valid non-zero counterparty address.");
  }
  return value;
}
