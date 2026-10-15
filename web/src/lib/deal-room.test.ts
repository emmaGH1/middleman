import test from "node:test";
import assert from "node:assert/strict";
import type { Address } from "viem";
import { isFresh, permittedActions, roleFor, type Deal } from "./deal-room";
import { assertSigner, assertSuccessfulReceipt } from "./transaction-guards";

const holder: Address = "0x1111111111111111111111111111111111111111";
const funder: Address = "0x2222222222222222222222222222222222222222";
const buyer: Address = "0x3333333333333333333333333333333333333333";
const deal: Deal = { holder, funder, proposer: holder, nft: buyer, tokenId: 0n, mintCost: 100n, collateral: 25n, salePrice: 300n, funderBps: 6000, deliverBy: 1000n, status: 0, principalDeposited: false, collateralDeposited: false, cancelVotes: 0 };

test("actions reflect the contract role and deadline rather than a linear step guess", () => {
  assert.deepEqual(permittedActions(deal, 1n), []);
  assert.deepEqual(permittedActions(deal, 1n, holder), ["cancel"]);
  assert.deepEqual(permittedActions(deal, 1n, funder), ["accept", "cancel"]);
  assert.deepEqual(permittedActions({ ...deal, status: 1 }, 1n, buyer), []);
  assert.deepEqual(permittedActions({ ...deal, status: 1 }, 1n, funder), ["fund", "cancel"]);
  assert.deepEqual(permittedActions({ ...deal, status: 1 }, 1000n, funder), ["cancel", "claimRefund"]);
  assert.deepEqual(permittedActions({ ...deal, status: 2, cancelVotes: 1 }, 1n, holder), ["mintAndLock"]);
  assert.deepEqual(permittedActions({ ...deal, status: 2, cancelVotes: 1 }, 1000n, funder), ["agreeCancel", "claimRefund"]);
  for (const account of [holder, funder, buyer]) assert.deepEqual(permittedActions({ ...deal, status: 3 }, 2000n, account), ["buy"]);
  for (const status of [4, 5, 6]) assert.deepEqual(permittedActions({ ...deal, status }, 2000n, holder), []);
  assert.equal(roleFor(deal), "visitor");
});

test("zero collateral is already covered and cannot be deposited twice", () => {
  assert.deepEqual(permittedActions({ ...deal, status: 1, collateral: 0n, collateralDeposited: true }, 1n, holder), ["cancel"]);
});

test("cached data, stale chain time, clock skew and missing data fail closed", () => {
  assert.equal(isFresh(1000n, 1_000_000, 1_005_000), true);
  assert.equal(isFresh(1000n, 1_000_000, 1_020_000), false);
  assert.equal(isFresh(900n, 1_005_000, 1_005_000), false);
  assert.equal(isFresh(1100n, 1_005_000, 1_005_000), false);
  assert.equal(isFresh(undefined, 1_005_000, 1_005_000), false);
});

test("network, changed signer and reverted transaction are rejected", async () => {
  const rpc = { getChainId: async () => 5042002 };
  const wallet = { ...rpc, getAddresses: async (): Promise<readonly Address[]> => [holder] };
  await assertSigner(wallet, rpc, 5042002, holder);
  await assert.rejects(assertSigner(wallet, rpc, 5042002, funder), /Wallet changed/);
  await assert.rejects(assertSigner(wallet, { getChainId: async () => 5042 }, 5042002, holder), /network changed/);
  await assert.rejects(assertSigner({ ...wallet, getChainId: async () => 5042 }, rpc, 5042002, holder), /network changed/);
  assert.throws(() => assertSuccessfulReceipt({ status: "reverted" }), /reverted/);
});
