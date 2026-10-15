/**
 * receipt-adapter.test.ts
 *
 * Unit tests for the Middleman deal receipt adapter.
 *
 * Runner:  node:test + node:assert/strict via tsx
 * Command: npx tsx --test src/lib/receipt-adapter.test.ts  (from middleman/web/)
 *
 * These are local unit tests with synchronous in-memory fixtures.
 * No network calls are made. No public evidence is simulated.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  type EvidenceScope,
  type ReceiptAdapterClient,
  type VerifiedDealEvent,
  verifyDealReceipts,
  readDealEventWindow,
  interpretDeal,
  type DealTerms,
} from "./receipt-adapter";

import type { Address, Hash } from "viem";

// ---------------------------------------------------------------------------
// Fixture constants
// ---------------------------------------------------------------------------

const CHAIN_ID = 5042002;
const ESCROW = "0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe" as Address;
const OTHER_ESCROW = "0x1111111111111111111111111111111111111111" as Address;

const DEAL_ID = 42n;
const OTHER_DEAL_ID = 99n;

const TX1 = ("0x" + "aa".repeat(32)) as Hash;
const TX2 = ("0x" + "bb".repeat(32)) as Hash;
const TX3 = ("0x" + "cc".repeat(32)) as Hash;
const TX_REVERTED = ("0x" + "dd".repeat(32)) as Hash;
const TX_WRONG_BLOCK = ("0x" + "ee".repeat(32)) as Hash;

const BH1 = ("0x" + "11".repeat(32)) as Hash;
const BH2 = ("0x" + "22".repeat(32)) as Hash;
const BH3 = ("0x" + "33".repeat(32)) as Hash;
const BH_REORG = ("0x" + "99".repeat(32)) as Hash;

const HOLDER = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as Address;
const FUNDER = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" as Address;
const BUYER  = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" as Address;

const FROM_BLOCK = 100n;
const TO_BLOCK = 200n;

/** A valid EvidenceScope for most tests. */
function makeScope(overrides: Partial<EvidenceScope> = {}): EvidenceScope {
  return {
    chainId: CHAIN_ID,
    escrow: ESCROW,
    dealId: DEAL_ID,
    fromBlock: FROM_BLOCK,
    toBlock: TO_BLOCK,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Log encoding helpers
//
// We encode events by hand using the ABI topic layout from the Solidity source.
// topic[0] = keccak256(eventSignature), topic[1..] = indexed args.
//
// Rather than computing keccak256 at test time, we import the known topic
// values from viem's parseAbi-derived ABI so we stay consistent with the
// adapter's own decodeEventLog calls.
// ---------------------------------------------------------------------------

import { encodeAbiParameters, keccak256, toHex, parseAbiParameters } from "viem";
import { middlemanAbi } from "../config/abi";

/** Extract the topic-0 hash for a given event name from middlemanAbi. */
function topic0(eventName: string): Hash {
  for (const item of middlemanAbi) {
    if (item.type === "event" && item.name === eventName) {
      // Rebuild the canonical signature string
      const paramStr = item.inputs
        .map((p) => {
          // Strip the `indexed` property for the signature string
          return p.type;
        })
        .join(",");
      return keccak256(
        new TextEncoder().encode(`${eventName}(${paramStr})`)
      ) as Hash;
    }
  }
  throw new Error(`event ${eventName} not found in middlemanAbi`);
}

/** Encode a uint256 as a 32-byte padded hex topic. */
function encodeTopic256(value: bigint): Hash {
  return toHex(value, { size: 32 }) as Hash;
}

/** Encode an address as a 32-byte padded hex topic. */
function encodeTopicAddress(addr: Address): Hash {
  return ("0x" + "00".repeat(12) + addr.slice(2).toLowerCase()) as Hash;
}

// Pre-compute topic-0 values.
const T0_PROPOSED = topic0("Proposed");
const T0_ACCEPTED = topic0("Accepted");
const T0_PRINCIPAL = topic0("PrincipalDeposited");
const T0_COLLATERAL = topic0("CollateralDeposited");
const T0_FUNDED = topic0("Funded");
const T0_NFTLOCKED = topic0("NFTLocked");
const T0_SOLD = topic0("Sold");
const T0_REFUNDED = topic0("Refunded");
const T0_CANCELLATION_AGREED = topic0("CancellationAgreed");
const T0_CANCELLED = topic0("Cancelled");

// ABI-encode non-indexed args for event data field.
function encodeUint256Pair(a: bigint, b: bigint): Hash {
  return encodeAbiParameters(parseAbiParameters("uint256, uint256"), [a, b]) as Hash;
}
function encodeUint256Single(a: bigint): Hash {
  return encodeAbiParameters(parseAbiParameters("uint256"), [a]) as Hash;
}

/** Build a minimal log object matching the ReceiptAdapterClient type. */
function makeLog(opts: {
  address: Address;
  topics: Hash[];
  data: Hash;
  txHash: Hash;
  blockHash: Hash;
  blockNumber: bigint;
  txIndex: number;
  logIndex: number;
  removed?: boolean;
}) {
  return {
    address: opts.address,
    topics: opts.topics as readonly Hash[],
    data: opts.data,
    transactionHash: opts.txHash,
    blockHash: opts.blockHash,
    blockNumber: opts.blockNumber,
    transactionIndex: opts.txIndex,
    logIndex: opts.logIndex,
    removed: opts.removed ?? false,
  };
}

// ---------------------------------------------------------------------------
// Fixture log builders
// ---------------------------------------------------------------------------

/** Proposed(dealId, holder, funder) — three indexed topics */
function proposedLog(txHash: Hash, bh: Hash, bn: bigint, li: number, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_PROPOSED, encodeTopic256(dealId), encodeTopicAddress(HOLDER), encodeTopicAddress(FUNDER)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** Accepted(dealId) — one indexed topic, no data */
function acceptedLog(txHash: Hash, bh: Hash, bn: bigint, li: number, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_ACCEPTED, encodeTopic256(dealId)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** Funded(dealId) — one indexed topic */
function fundedLog(txHash: Hash, bh: Hash, bn: bigint, li: number, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_FUNDED, encodeTopic256(dealId)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** NFTLocked(dealId, tokenId) — two indexed topics */
function nftLockedLog(txHash: Hash, bh: Hash, bn: bigint, li: number, tokenId: bigint = 1n, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_NFTLOCKED, encodeTopic256(dealId), encodeTopic256(tokenId)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** Sold(dealId, buyer, funderPayout, holderPayout) — two indexed, two non-indexed */
function soldLog(txHash: Hash, bh: Hash, bn: bigint, li: number, fPayout: bigint, hPayout: bigint, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_SOLD, encodeTopic256(dealId), encodeTopicAddress(BUYER)],
    data: encodeUint256Pair(fPayout, hPayout),
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** CancellationAgreed(dealId, party) — two indexed topics */
function cancellationAgreedLog(txHash: Hash, bh: Hash, bn: bigint, li: number, party: Address = HOLDER, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_CANCELLATION_AGREED, encodeTopic256(dealId), encodeTopicAddress(party)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

/** Cancelled(dealId) — one indexed topic */
function cancelledLog(txHash: Hash, bh: Hash, bn: bigint, li: number, dealId: bigint = DEAL_ID) {
  return makeLog({
    address: ESCROW,
    topics: [T0_CANCELLED, encodeTopic256(dealId)],
    data: "0x" as Hash,
    txHash, blockHash: bh, blockNumber: bn, txIndex: 0, logIndex: li,
  });
}

// ---------------------------------------------------------------------------
// Minimal mock client builder
// ---------------------------------------------------------------------------

interface MockReceiptOpts {
  hash: Hash;
  blockHash: Hash;
  blockNumber: bigint;
  txIndex?: number;
  status?: "success" | "reverted";
  logs: ReturnType<typeof makeLog>[];
}

interface MockBlockOpts {
  number: bigint;
  hash: Hash;
  timestamp: bigint;
}

/**
 * Build a minimal ReceiptAdapterClient from explicit fixture maps.
 * Missing hashes cause getTransactionReceipt to throw (simulates "not found").
 */
function makeClient(opts: {
  chainId?: number;
  receipts: MockReceiptOpts[];
  blocks: MockBlockOpts[];
  logs?: ReturnType<typeof makeLog>[];
}): ReceiptAdapterClient {
  const receiptMap = new Map<Hash, MockReceiptOpts>();
  for (const r of opts.receipts) receiptMap.set(r.hash, r);

  const blockMap = new Map<bigint, MockBlockOpts>();
  for (const b of opts.blocks) blockMap.set(b.number, b);

  return {
    async getChainId() {
      return opts.chainId ?? CHAIN_ID;
    },
    async getTransactionReceipt({ hash }) {
      const r = receiptMap.get(hash);
      if (!r) throw new Error(`mock: no receipt for ${hash}`);
      return {
        status: r.status ?? "success",
        transactionHash: r.hash,
        blockHash: r.blockHash,
        blockNumber: r.blockNumber,
        transactionIndex: r.txIndex ?? 0,
        logs: r.logs,
      };
    },
    async getBlock({ blockNumber }) {
      const b = blockMap.get(blockNumber);
      if (!b) throw new Error(`mock: no block for ${blockNumber}`);
      return { hash: b.hash, number: b.number, timestamp: b.timestamp };
    },
    async getLogs() {
      return (opts.logs ?? []).map((l) => ({
        address: l.address,
        topics: l.topics,
        transactionHash: l.transactionHash,
        blockHash: l.blockHash,
        blockNumber: l.blockNumber,
        logIndex: l.logIndex,
        removed: l.removed,
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Chronological ordering and deduplication
// ---------------------------------------------------------------------------

test("unordered and duplicate candidate hashes produce chronological events", async () => {
  // TX2 is in an earlier block than TX1 in this test.
  // Duplicate TX2 supplied — should appear only once.
  const client = makeClient({
    receipts: [
      {
        hash: TX2,
        blockHash: BH2,
        blockNumber: 110n,
        txIndex: 0,
        logs: [acceptedLog(TX2, BH2, 110n, 0)],
      },
      {
        hash: TX1,
        blockHash: BH1,
        blockNumber: 150n,
        txIndex: 0,
        logs: [fundedLog(TX1, BH1, 150n, 0)],
      },
    ],
    blocks: [
      { number: 110n, hash: BH2, timestamp: 1700000110n },
      { number: 150n, hash: BH1, timestamp: 1700000150n },
    ],
  });

  // Supply TX1 first, then TX2 twice.
  const events = await verifyDealReceipts(client, makeScope(), [TX1, TX2, TX2]);

  assert.equal(events.length, 2, "two distinct events");
  // First event must be from block 110 (TX2 / Accepted), second from 150 (TX1 / Funded)
  assert.equal(events[0].eventName, "Accepted");
  assert.equal(events[0].blockNumber, 110n);
  assert.equal(events[0].timestamp, 1700000110n);
  assert.equal(events[1].eventName, "Funded");
  assert.equal(events[1].blockNumber, 150n);
  assert.equal(events[1].timestamp, 1700000150n);
});

// ---------------------------------------------------------------------------
// 2. Multiple events in one receipt are all preserved
// ---------------------------------------------------------------------------

test("multiple lifecycle events in one receipt are all preserved", async () => {
  // Synthetic decoder fixture; real final cancellation emits one vote plus Cancelled.
  const logs = [
    cancellationAgreedLog(TX1, BH1, 140n, 0, HOLDER),
    cancellationAgreedLog(TX1, BH1, 140n, 1, FUNDER),
    cancelledLog(TX1, BH1, 140n, 2),
  ];
  const client = makeClient({
    receipts: [{ hash: TX1, blockHash: BH1, blockNumber: 140n, txIndex: 0, logs }],
    blocks: [{ number: 140n, hash: BH1, timestamp: 1700000140n }],
  });

  const events = await verifyDealReceipts(client, makeScope(), [TX1]);

  assert.equal(events.length, 3, "three events from one receipt");
  assert.equal(events[0].eventName, "CancellationAgreed");
  assert.equal(events[0].logIndex, 0);
  assert.equal(events[1].eventName, "CancellationAgreed");
  assert.equal(events[1].logIndex, 1);
  assert.equal(events[2].eventName, "Cancelled");
  assert.equal(events[2].logIndex, 2);
  // All carry the same transactionHash and blockNumber
  for (const ev of events) {
    assert.equal(ev.transactionHash, TX1);
    assert.equal(ev.blockNumber, 140n);
    assert.equal(ev.timestamp, 1700000140n);
  }
});

// ---------------------------------------------------------------------------
// 3. Other deals and other addresses are excluded
// ---------------------------------------------------------------------------

test("events for other dealIds and other contract addresses are excluded", async () => {
  const logs = [
    // Matching event
    fundedLog(TX1, BH1, 130n, 0, DEAL_ID),
    // Other deal — same escrow, different id
    fundedLog(TX1, BH1, 130n, 1, OTHER_DEAL_ID),
    // Other contract — same deal id
    makeLog({
      address: OTHER_ESCROW,
      topics: [T0_FUNDED, encodeTopic256(DEAL_ID)],
      data: "0x" as Hash,
      txHash: TX1, blockHash: BH1, blockNumber: 130n, txIndex: 0, logIndex: 2,
    }),
  ];
  const client = makeClient({
    receipts: [{ hash: TX1, blockHash: BH1, blockNumber: 130n, txIndex: 0, logs }],
    blocks: [{ number: 130n, hash: BH1, timestamp: 1700000130n }],
  });

  const events = await verifyDealReceipts(client, makeScope(), [TX1]);

  assert.equal(events.length, 1);
  assert.equal(events[0].eventName, "Funded");
  const args = events[0].args as { id: bigint };
  assert.equal(args.id, DEAL_ID);
});

// ---------------------------------------------------------------------------
// 4. Chain ID mismatch is rejected
// ---------------------------------------------------------------------------

test("chain ID mismatch rejects before any receipt fetch", async () => {
  const client = makeClient({
    chainId: 1, // Ethereum mainnet — not scope's 5042002
    receipts: [],
    blocks: [],
  });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX1]),
    (err: Error) => {
      assert.match(err.message, /chain mismatch/i);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 5. Reverted receipt is rejected
// ---------------------------------------------------------------------------

test("reverted receipt is rejected with a descriptive error", async () => {
  const client = makeClient({
    receipts: [
      {
        hash: TX_REVERTED,
        blockHash: BH1,
        blockNumber: 120n,
        status: "reverted",
        logs: [],
      },
    ],
    blocks: [{ number: 120n, hash: BH1, timestamp: 1700000120n }],
  });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX_REVERTED]),
    (err: Error) => {
      assert.match(err.message, /reverted/i);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 6. Canonical block hash mismatch is rejected
// ---------------------------------------------------------------------------

test("canonical block hash mismatch (possible reorg) is rejected", async () => {
  // Receipt claims blockHash BH1, but getBlock returns BH_REORG for that number.
  const client = makeClient({
    receipts: [
      {
        hash: TX1,
        blockHash: BH1,  // receipt says BH1
        blockNumber: 130n,
        logs: [fundedLog(TX1, BH1, 130n, 0)],
      },
    ],
    blocks: [
      { number: 130n, hash: BH_REORG, timestamp: 1700000130n }, // canonical says BH_REORG
    ],
  });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX1]),
    (err: Error) => {
      assert.match(err.message, /canonical block hash mismatch/i);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 7. Invalid scope is rejected
// ---------------------------------------------------------------------------

test("invalid scope parameters are rejected before any network call", async () => {
  const client = makeClient({ receipts: [], blocks: [] });

  // dealId = 0
  await assert.rejects(
    () => verifyDealReceipts(client, makeScope({ dealId: 0n }), []),
    /dealId must be positive/i
  );

  // fromBlock > toBlock
  await assert.rejects(
    () => verifyDealReceipts(client, makeScope({ fromBlock: 200n, toBlock: 100n }), []),
    /fromBlock.*>.*toBlock/i
  );

  // invalid escrow address
  await assert.rejects(
    () => verifyDealReceipts(client, makeScope({ escrow: "0xnot_an_address" as Address }), []),
    /escrow/i
  );

  // invalid chainId
  await assert.rejects(
    () => verifyDealReceipts(client, makeScope({ chainId: -1 }), []),
    /chainId/i
  );
});

// ---------------------------------------------------------------------------
// 8. Invalid hash format is rejected
// ---------------------------------------------------------------------------

test("invalid transaction hash format is rejected", async () => {
  const client = makeClient({ receipts: [], blocks: [] });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), ["not-a-hash" as Hash]),
    /invalid transaction hash/i
  );
});

// ---------------------------------------------------------------------------
// 9. Receipt with no matching deal events fails explicitly
// ---------------------------------------------------------------------------

test("receipt with no matching events for the deal fails explicitly", async () => {
  // TX has logs only for OTHER_DEAL_ID — no events for DEAL_ID.
  const client = makeClient({
    receipts: [
      {
        hash: TX1,
        blockHash: BH1,
        blockNumber: 130n,
        logs: [fundedLog(TX1, BH1, 130n, 0, OTHER_DEAL_ID)],
      },
    ],
    blocks: [{ number: 130n, hash: BH1, timestamp: 1700000130n }],
  });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX1]),
    (err: Error) => {
      assert.match(err.message, /no events for deal/i);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 10. Missing receipt (client throws) fails closed
// ---------------------------------------------------------------------------

test("missing receipt (client throws) fails closed with useful error", async () => {
  const client = makeClient({ receipts: [], blocks: [] }); // no receipt for TX1

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX1]),
    (err: Error) => {
      assert.match(err.message, /receipt unavailable/i);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 11. Receipt outside scope block range is rejected
// ---------------------------------------------------------------------------

test("receipt outside scope block range is rejected", async () => {
  // Block 50 is before FROM_BLOCK (100).
  const client = makeClient({
    receipts: [
      {
        hash: TX_WRONG_BLOCK,
        blockHash: BH3,
        blockNumber: 50n, // outside [100, 200]
        logs: [fundedLog(TX_WRONG_BLOCK, BH3, 50n, 0)],
      },
    ],
    blocks: [{ number: 50n, hash: BH3, timestamp: 1700000050n }],
  });

  await assert.rejects(
    () => verifyDealReceipts(client, makeScope(), [TX_WRONG_BLOCK]),
    /outside scope/i
  );
});

// ---------------------------------------------------------------------------
// 12. readDealEventWindow — range > 2000 blocks is rejected
// ---------------------------------------------------------------------------

test("readDealEventWindow rejects ranges wider than 2000 blocks", async () => {
  const client = makeClient({ receipts: [], blocks: [], logs: [] });

  await assert.rejects(
    () =>
      readDealEventWindow(
        client,
        makeScope({ fromBlock: 0n, toBlock: 2001n }) // 2002-block window
      ),
    /2000.block limit/i
  );
});

// ---------------------------------------------------------------------------
// 13. readDealEventWindow — end-to-end with getLogs -> verifyDealReceipts
// ---------------------------------------------------------------------------

test("readDealEventWindow passes candidate hashes from getLogs to verifier", async () => {
  const logs = [proposedLog(TX1, BH1, 110n, 0)];
  const client = makeClient({
    receipts: [
      {
        hash: TX1,
        blockHash: BH1,
        blockNumber: 110n,
        logs,
      },
    ],
    blocks: [
      { number: 110n, hash: BH1, timestamp: 1700000110n },
      { number: TO_BLOCK, hash: BH2, timestamp: 1700000200n },
    ],
    logs,
  });

  const events = await readDealEventWindow(client, makeScope());

  assert.equal(events.length, 1);
  assert.equal(events[0].eventName, "Proposed");
});

// ---------------------------------------------------------------------------
// 14. readDealEventWindow — empty window still validates chain
// ---------------------------------------------------------------------------

test("readDealEventWindow with empty log result validates chain and returns empty array", async () => {
  const client = makeClient({
    chainId: 1, // wrong chain
    receipts: [],
    blocks: [],
    logs: [],
  });

  await assert.rejects(
    () => readDealEventWindow(client, makeScope()),
    /chain mismatch/i
  );
});

// ---------------------------------------------------------------------------
// 15. interpretDeal — six-decimal integer payout rounding
// ---------------------------------------------------------------------------

test("interpretDeal computes funder payout with integer floor rounding at six decimals", () => {
  // mintCost=100 USDC, salePrice=300 USDC, funderBps=6000 (60%)
  // profit = 200 USDC, funder profit share = floor(200 * 6000 / 10000) = 120
  // funderPayout = 100 + 120 = 220 USDC
  const terms: DealTerms = {
    mintCost: 100_000_000n, // 100 USDC (6 dec)
    collateral: 25_000_000n,
    funderBps: 6000,
    salePrice: 300_000_000n,
    principalDeposited: true,
    collateralDeposited: true,
  };
  const interp = interpretDeal(terms, "NFTLocked");

  assert.equal(interp.computedFunderSalePayout, 220_000_000n);
  assert.equal(interp.computedHolderSalePayout, 105_000_000n);
  // 220 + 105 = 325 = salePrice(300) + collateral(25)
  assert.equal(
    interp.computedFunderSalePayout + interp.computedHolderSalePayout,
    300_000_000n + 25_000_000n
  );
});

test("interpretDeal — odd profit rounding floors to funder", () => {
  // profit = 1, bps = 9999 => floor(1 * 9999 / 10000) = 0, funder gets mintCost only
  const terms: DealTerms = {
    mintCost: 1n,
    collateral: 0n,
    funderBps: 9999,
    salePrice: 2n,
    principalDeposited: true,
    collateralDeposited: true,
  };
  const interp = interpretDeal(terms, "NFTLocked");
  assert.equal(interp.computedFunderSalePayout, 1n); // mintCost + floor(1*9999/10000)=0
  assert.equal(interp.computedHolderSalePayout, 1n); // 2+0-1=1
});

// ---------------------------------------------------------------------------
// 16. interpretDeal — zero collateral
// ---------------------------------------------------------------------------

test("interpretDeal with zero collateral: collateralDeposited auto-true, amount 0", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 0n,
    funderBps: 5000,
    salePrice: 150_000_000n,
    principalDeposited: true,
    collateralDeposited: true, // auto-set at proposal, no event emitted
  };
  const interp = interpretDeal(terms, "Funded");

  assert.equal(interp.computedCollateralDeposited, 0n);
  assert.equal(interp.zeroCollateralAutoDeposited, true);
  // Reserved = principal (no collateral)
  assert.equal(interp.computedCurrentlyReserved, 100_000_000n);
  // Timeout: fully funded (both flags true), funder gets all = principal + 0 = 100
  assert.equal(interp.expectedFunderTimeoutReturn, 100_000_000n);
  assert.equal(interp.expectedHolderTimeoutReturn, 0n);
});

// ---------------------------------------------------------------------------
// 17. interpretDeal — incomplete vs fully funded timeout
// ---------------------------------------------------------------------------

test("interpretDeal — incomplete funding timeout: each party recovers only their deposit", () => {
  // Only principal deposited, collateral not yet deposited (and > 0)
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 25_000_000n,
    funderBps: 5000,
    salePrice: 150_000_000n,
    principalDeposited: true,
    collateralDeposited: false,
  };
  const interp = interpretDeal(terms, "Active");

  assert.equal(interp.expectedFunderTimeoutReturn, 100_000_000n);
  assert.equal(interp.expectedHolderTimeoutReturn, 0n); // holder never deposited
});

test("interpretDeal — fully funded timeout: funder receives principal + collateral (penalty)", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 25_000_000n,
    funderBps: 5000,
    salePrice: 150_000_000n,
    principalDeposited: true,
    collateralDeposited: true,
  };
  const interp = interpretDeal(terms, "Funded");

  assert.equal(interp.expectedFunderTimeoutReturn, 125_000_000n); // 100 + 25
  assert.equal(interp.expectedHolderTimeoutReturn, 0n);
});

test("interpretDeal — neither party deposited: zero timeout returns", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 25_000_000n,
    funderBps: 5000,
    salePrice: 150_000_000n,
    principalDeposited: false,
    collateralDeposited: false,
  };
  const interp = interpretDeal(terms, "Active");

  assert.equal(interp.expectedFunderTimeoutReturn, 0n);
  assert.equal(interp.expectedHolderTimeoutReturn, 0n);
});

// ---------------------------------------------------------------------------
// 18. interpretDeal — Proposed then Cancelled is not treated as sold
// ---------------------------------------------------------------------------

test("interpretDeal — Proposed=>Cancelled does not imply acceptance", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 0n,
    funderBps: 5000,
    salePrice: 100_000_000n,
    principalDeposited: false,
    collateralDeposited: true, // zero collateral auto-deposited
  };

  const proposed = interpretDeal(terms, "Proposed");
  assert.equal(proposed.preAcceptanceCancellationPossible, true);

  const cancelled = interpretDeal(terms, "Cancelled");
  // preAcceptanceCancellationPossible true when status is Proposed or Cancelled
  assert.equal(cancelled.preAcceptanceCancellationPossible, true);
  // Reserved is zero — no funds remain in escrow
  assert.equal(cancelled.computedCurrentlyReserved, 0n);
  // Principal was never deposited
  assert.equal(cancelled.computedPrincipalDeposited, 0n);
  assert.equal(cancelled.computedPrincipalSpent, 0n);
  // Cancellation returns: each party recovers their deposit
  assert.equal(cancelled.expectedFunderCancellationReturn, 0n);
  assert.equal(cancelled.expectedHolderCancellationReturn, 0n); // zero collateral
});

// ---------------------------------------------------------------------------
// 19. interpretDeal — Sold state: reserved = 0, principal spent
// ---------------------------------------------------------------------------

test("interpretDeal — Sold state: reserved is 0, computedPrincipalSpent equals mintCost", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 25_000_000n,
    funderBps: 5000,
    salePrice: 200_000_000n,
    principalDeposited: true,
    collateralDeposited: true,
  };
  const interp = interpretDeal(terms, "Sold");

  assert.equal(interp.computedCurrentlyReserved, 0n);
  assert.equal(interp.computedPrincipalSpent, 100_000_000n);
  assert.equal(interp.postMintRisk.anyAddressMayBuy, true);
  assert.equal(interp.postMintRisk.noPriceChangeOrGuaranteedBuyer, true);
  assert.equal(interp.postMintRisk.noPostMintCancellationOrDeadlineRefund, true);
});

// ---------------------------------------------------------------------------
// 20. interpretDeal — NFTLocked: principal spent, collateral still reserved
// ---------------------------------------------------------------------------

test("interpretDeal — NFTLocked: principal spent to mint, only collateral still reserved", () => {
  const terms: DealTerms = {
    mintCost: 100_000_000n,
    collateral: 25_000_000n,
    funderBps: 5000,
    salePrice: 200_000_000n,
    principalDeposited: true,
    collateralDeposited: true,
  };
  const interp = interpretDeal(terms, "NFTLocked");

  assert.equal(interp.computedPrincipalSpent, 100_000_000n);
  assert.equal(interp.computedCurrentlyReserved, 25_000_000n); // only collateral left
});

// ---------------------------------------------------------------------------
// 21. verifyDealReceipts — removed logs in receipt are skipped
// ---------------------------------------------------------------------------

test("removed log in receipt is skipped (not matched, not counted)", async () => {
  const removedLog = makeLog({
    address: ESCROW,
    topics: [T0_FUNDED, encodeTopic256(DEAL_ID)],
    data: "0x" as Hash,
    txHash: TX1, blockHash: BH1, blockNumber: 130n, txIndex: 0, logIndex: 0,
    removed: true,
  });
  const normalLog = fundedLog(TX1, BH1, 130n, 1);

  const client = makeClient({
    receipts: [
      {
        hash: TX1,
        blockHash: BH1,
        blockNumber: 130n,
        logs: [removedLog, normalLog],
      },
    ],
    blocks: [{ number: 130n, hash: BH1, timestamp: 1700000130n }],
  });

  const events = await verifyDealReceipts(client, makeScope(), [TX1]);
  assert.equal(events.length, 1);
  assert.equal(events[0].logIndex, 1); // the non-removed log
});

test("window filters unrelated deals before fetching receipts and enforces exactly 2000 blocks", async () => {
  const client = makeClient({ receipts: [], blocks: [{ number: 200n, hash: BH1, timestamp: 1700000200n }], logs: [fundedLog(TX1, BH1, 130n, 0, OTHER_DEAL_ID)] });
  assert.deepEqual(await readDealEventWindow(client, makeScope()), []);
  await assert.rejects(readDealEventWindow(client, makeScope({ fromBlock: 0n, toBlock: 2000n })), /2000.block limit/);
});

test("tip reorganization, inconsistent log positions and over-limit input fail closed", async () => {
  const log = fundedLog(TX1, BH1, 130n, 0);
  const client = makeClient({ receipts: [{ hash: TX1, blockHash: BH1, blockNumber: 130n, logs: [{ ...log, blockNumber: 131n }] }], blocks: [{ number: 130n, hash: BH1, timestamp: 1700000130n }, { number: 200n, hash: BH2, timestamp: 1700000200n }] });
  await assert.rejects(verifyDealReceipts(client, makeScope(), [TX1]), /position/);
  await assert.rejects(verifyDealReceipts(client, makeScope(), Array.from({ length: 101 }, (_, i) => toHex(i, { size: 32 }))), /at most 100/);
  let calls = 0;
  client.getBlock = async ({ blockNumber }) => ({ number: blockNumber, timestamp: 1700000200n, hash: calls++ ? BH_REORG : BH2 });
  await assert.rejects(readDealEventWindow(client, makeScope()), /Tip block hash changed/);
});

test("interpretation rejects uncovered sale terms instead of displaying a negative holder payout", () => {
  assert.throws(() => interpretDeal({ mintCost: 100n, collateral: 25n, salePrice: 74n, funderBps: 6000, principalDeposited: false, collateralDeposited: false }, "Proposed"), /cover/);
});
