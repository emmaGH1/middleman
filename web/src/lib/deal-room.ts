import type { Address, ContractFunctionReturnType } from "viem";
import type { middlemanAbi } from "../config/abi";

export type Deal = ContractFunctionReturnType<typeof middlemanAbi, "view", "getDeal">;
export type DealAction = "accept" | "fund" | "postCollateral" | "mintAndLock" | "buy" | "cancel" | "agreeCancel" | "claimRefund";

export function roleFor(deal: Deal, address?: Address) {
  if (!address) return "visitor";
  if (address.toLowerCase() === deal.holder.toLowerCase()) return "holder";
  if (address.toLowerCase() === deal.funder.toLowerCase()) return "funder";
  return "buyer";
}

export function permittedActions(deal: Deal, timestamp: bigint, address?: Address): DealAction[] {
  if (!address) return [];
  const role = roleFor(deal, address), party = role === "holder" || role === "funder";
  const beforeDeadline = timestamp < deal.deliverBy;
  const actions: DealAction[] = [];
  if (deal.status === 0 && party && address.toLowerCase() !== deal.proposer.toLowerCase() && beforeDeadline) actions.push("accept");
  if (deal.status === 1 && beforeDeadline) {
    if (role === "funder" && !deal.principalDeposited) actions.push("fund");
    if (role === "holder" && !deal.collateralDeposited) actions.push("postCollateral");
  }
  if (deal.status === 2 && role === "holder" && beforeDeadline) actions.push("mintAndLock");
  if (deal.status === 3) actions.push("buy");
  if (deal.status < 2 && party) actions.push("cancel");
  if (deal.status === 2 && party && !(deal.cancelVotes & (role === "holder" ? 1 : 2))) actions.push("agreeCancel");
  if ((deal.status === 1 || deal.status === 2) && !beforeDeadline && party) actions.push("claimRefund");
  return actions;
}

export function isFresh(timestamp: bigint | undefined, updatedAt: number, now: number) {
  if (timestamp === undefined || !updatedAt || !now) return false;
  const age = now / 1000 - Number(timestamp);
  return now - updatedAt < 20_000 && age >= -30 && age < 60;
}

export const mintRisk = "After minting there is no guaranteed buyer, repricing, cancellation or deadline refund. The NFT and collateral can remain locked indefinitely.";
