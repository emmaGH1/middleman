import test from "node:test";
import assert from "node:assert/strict";
import { deadlineLabel, parseUSDC, payouts, returnedDeposits, validateCounterparty } from "./deal";

test("USDC input is exact at six decimals, never silently rounded", () => {
  assert.equal(parseUSDC("1.000001"), 1000001n);
  for (const invalid of ["1.0000001", "-1", "1e6", "", ".5", "Infinity"]) assert.throws(() => parseUSDC(invalid));
  assert.throws(() => parseUSDC(((1n << 128n) / 1000000n + 1n).toString()));
});
test("split conserves sale and collateral with funder-first principal", () => {
  assert.deepEqual(payouts(100000000n, 25000000n, 300000000n, 6000), { funder: 220000000n, holder: 105000000n });
  assert.deepEqual(payouts(100000000n, 25000000n, 80000000n, 6000), { funder: 100000000n, holder: 5000000n });
  assert.deepEqual(payouts(1n, 0n, 2n, 9999), { funder: 1n, holder: 1n });
  assert.throws(() => payouts(100n, 25n, 74n, 6000));
  assert.throws(() => payouts(100n, 25n, 300n, 10001));
  for (let bps = 0; bps <= 10000; bps += 100) {
    const p = payouts(100n, 25n, 301n, bps);
    assert.equal(p.funder + p.holder, 326n);
    assert.ok(p.funder >= 100n);
  }
});
test("counterparty must be a different nonzero wallet", () => {
  const self = "0x1111111111111111111111111111111111111111";
  for (const other of [self, "0x0000000000000000000000000000000000000000", "not a wallet"]) assert.throws(() => validateCounterparty(other, self));
});
test("arbitrarily distant onchain deadline cannot crash rendering", () => {
  assert.match(deadlineLabel(1n << 63n), /seconds since Unix epoch/);
  assert.match(deadlineLabel(0n), /1970/);
});
test("terminal returns reflect timeout penalties, cancellation and actual deposits", () => {
  assert.deepEqual(returnedDeposits(100n, 25n, true, true, true), { funder: 125n, holder: 0n });
  assert.deepEqual(returnedDeposits(100n, 25n, true, true, false), { funder: 100n, holder: 25n });
  assert.deepEqual(returnedDeposits(100n, 25n, true, false, true), { funder: 100n, holder: 0n });
  assert.deepEqual(returnedDeposits(100n, 25n, false, true, true), { funder: 0n, holder: 25n });
  assert.deepEqual(returnedDeposits(100n, 25n, false, false, false), { funder: 0n, holder: 0n });
});
