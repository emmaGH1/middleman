import test from "node:test";
import assert from "node:assert/strict";
import { candidateHashes } from "./events";

test("explorer responses supply bounded hash hints only, never trusted events", () => {
  const hash = `0x${"a".repeat(64)}`;
  assert.deepEqual(candidateHashes({ result: [{ transactionHash: hash, timeStamp: "fake" }, { transactionHash: hash }] }), { hashes: [hash], truncated: false });
  for (const payload of [null, {}, { result: "rate limited" }, { result: [null] }, { result: [{ transactionHash: "fake" }] }]) assert.throws(() => candidateHashes(payload));
  assert.throws(() => candidateHashes({ result: Array(101).fill({ transactionHash: hash }) }));
  assert.equal(candidateHashes({ result: Array(100).fill({ transactionHash: hash }) }).truncated, true);
});
