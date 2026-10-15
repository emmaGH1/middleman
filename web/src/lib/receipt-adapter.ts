/**
 * receipt-adapter.ts
 *
 * Framework-independent typed evidence adapter for Middleman deal events.
 *
 * SCOPE:
 *   Read-only. No transactions, no signing, no wallet creation, no funds.
 *   All exported values are derived from onchain receipts and block headers
 *   that the caller supplies via a minimal viem public-client interface.
 *
 * TRUST MODEL:
 *   - Candidate transaction hashes are untrusted discovery hints.
 *   - Nothing is labelled "verified" until receipt success, canonical block
 *     hash/number, and log membership have all been checked independently.
 *   - Chain ID is validated before any evidence is fetched.
 *   - Unknown or unrelated logs are silently ignored; a receipt whose logs
 *     contain no matching Middleman events for the given deal fails explicitly.
 */

import { decodeEventLog, toHex, type Address, type Hash } from "viem";
import { middlemanAbi } from "../config/abi";
import { payouts, returnedDeposits } from "./deal";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Bounds for one evidence-collection run. */
export interface EvidenceScope {
  /** Numeric chain ID to validate against the client before any RPC call. */
  chainId: number;
  /** Checksummed address of the Middleman escrow contract. */
  escrow: Address;
  /** Positive deal id as returned by getDeal / Proposed event. */
  dealId: bigint;
  /** Inclusive start block (deployment block or user-supplied lower bound). */
  fromBlock: bigint;
  /** Inclusive end block. */
  toBlock: bigint;
}

// Derive the union of decoded events from decodeEventLog over middlemanAbi.
// We use a helper type so each member carries the full provenance fields.
type DecodedEvent = ReturnType<typeof decodeEventLog<typeof middlemanAbi>>;

/**
 * A single Middleman lifecycle event that has been independently verified
 * against its receipt and canonical block header.
 *
 * eventName and args are narrowed by the discriminated-union return of
 * decodeEventLog; the remaining fields are provenance from the receipt/block.
 */
export type VerifiedDealEvent = DecodedEvent & {
  transactionHash: Hash;
  blockHash: Hash;
  blockNumber: bigint;
  transactionIndex: number;
  logIndex: number;
  /** Unix seconds from the canonical block header (not log metadata). */
  timestamp: bigint;
};

// ---------------------------------------------------------------------------
// Minimal client interface
// ---------------------------------------------------------------------------

/**
 * The subset of a viem PublicClient this adapter actually calls.
 * Keeping it narrow lets callers substitute mocks without broad any casts.
 */
export interface ReceiptAdapterClient {
  getChainId(): Promise<number>;
  getTransactionReceipt(args: { hash: Hash }): Promise<{
    status: "success" | "reverted";
    transactionHash: Hash;
    blockHash: Hash;
    blockNumber: bigint;
    transactionIndex: number;
    logs: readonly {
      address: Address;
      topics: readonly Hash[];
      data: Hash;
      transactionHash: Hash;
      blockHash: Hash;
      blockNumber: bigint;
      transactionIndex: number;
      logIndex: number;
      removed: boolean;
    }[];
  }>;
  getBlock(args: { blockNumber: bigint }): Promise<{
    hash: Hash;
    number: bigint;
    timestamp: bigint;
  }>;
  getLogs(args: {
    address: Address;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<
    readonly {
      address: Address;
      topics: readonly Hash[];
      transactionHash: Hash | null;
      blockHash: Hash | null;
      blockNumber: bigint | null;
      logIndex: number | null;
      removed: boolean;
    }[]
  >;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HASHES = 100;
const MAX_WINDOW = 2000n;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function validateScope(scope: EvidenceScope): void {
  if (
    !Number.isInteger(scope.chainId) ||
    scope.chainId <= 0 ||
    scope.chainId > 0x7fffffff
  ) {
    throw new Error(`EvidenceScope: chainId ${scope.chainId} is not a safe positive integer`);
  }
  if (!scope.escrow || !/^0x[0-9a-fA-F]{40}$/.test(scope.escrow)) {
    throw new Error(`EvidenceScope: escrow is not a valid address`);
  }
  if (scope.dealId <= 0n) {
    throw new Error(`EvidenceScope: dealId must be positive, got ${scope.dealId}`);
  }
  if (scope.fromBlock > scope.toBlock) {
    throw new Error(
      `EvidenceScope: fromBlock ${scope.fromBlock} > toBlock ${scope.toBlock}`
    );
  }
  if (scope.fromBlock < 0n) throw new Error("EvidenceScope: negative block number");
}

function validateHashes(hashes: readonly Hash[]): void {
  for (const h of hashes) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      throw new Error(`Invalid transaction hash: ${h}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Block cache (per-invocation only — no module-global state)
// ---------------------------------------------------------------------------

type BlockEntry = { hash: Hash; number: bigint; timestamp: bigint };

async function cachedGetBlock(
  client: ReceiptAdapterClient,
  blockNumber: bigint,
  cache: Map<bigint, BlockEntry>
): Promise<BlockEntry> {
  const cached = cache.get(blockNumber);
  if (cached !== undefined) return cached;
  const block = await client.getBlock({ blockNumber });
  cache.set(blockNumber, block);
  return block;
}

// ---------------------------------------------------------------------------
// Core verifier
// ---------------------------------------------------------------------------

/**
 * Fetch and verify up to MAX_HASHES unique receipts, then extract and decode
 * all Middleman events for scope.dealId from this escrow contract.
 *
 * Fail-closed rules:
 *   - Chain ID must match scope before any other call.
 *   - Receipt must have status "success".
 *   - Receipt transactionHash must equal the requested hash.
 *   - Receipt blockNumber must be within [scope.fromBlock, scope.toBlock].
 *   - Canonical block hash and number must match receipt values.
 *   - Each log in the receipt must carry the same transactionHash, blockHash,
 *     and a non-negative logIndex; removed logs are skipped.
 *   - A receipt that contains zero matching deal events fails explicitly.
 *
 * Unknown or unrelated logs (wrong address, wrong id, unrecognised topic) are
 * silently ignored. Multiple matching events in one receipt are all preserved.
 */
export async function verifyDealReceipts(
  client: ReceiptAdapterClient,
  scope: EvidenceScope,
  hashes: readonly Hash[]
): Promise<VerifiedDealEvent[]> {
  // 1. Validate inputs before any network call.
  validateScope(scope);
  validateHashes(hashes);

  // 2. Chain ID check — first RPC call.
  const liveChainId = await client.getChainId();
  if (liveChainId !== scope.chainId) {
    throw new Error(
      `Chain mismatch: client is on chain ${liveChainId}, scope requires ${scope.chainId}`
    );
  }

  // 3. Deduplicate and cap candidate hashes.
  const unique = [...new Set(hashes.map(hash => hash.toLowerCase() as Hash))];
  if (unique.length > MAX_HASHES) throw new Error("Too many receipt hashes; request at most 100 at a time.");

  // Per-invocation block cache — no module-global state.
  const blockCache = new Map<bigint, BlockEntry>();

  const events: VerifiedDealEvent[] = [];

  // 4. Sequential receipt fetches — bounded concurrency (no unbounded Promise.all).
  for (const hash of unique) {
    let receipt: Awaited<ReturnType<ReceiptAdapterClient["getTransactionReceipt"]>>;
    try {
      receipt = await client.getTransactionReceipt({ hash });
    } catch (err) {
      throw new Error(
        `Receipt unavailable for ${hash}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 4a. Hash identity.
    if (receipt.transactionHash.toLowerCase() !== hash) {
      throw new Error(
        `Receipt hash mismatch: requested ${hash}, got ${receipt.transactionHash}`
      );
    }

    // 4b. Success check.
    if (receipt.status !== "success") {
      throw new Error(`Receipt for ${hash} has status "${receipt.status}" (reverted)`);
    }

    // 4c. Block within scope.
    if (
      receipt.blockNumber < scope.fromBlock ||
      receipt.blockNumber > scope.toBlock
    ) {
      throw new Error(
        `Receipt for ${hash} is in block ${receipt.blockNumber}, outside scope [${scope.fromBlock}, ${scope.toBlock}]`
      );
    }

    // 4d. Canonical block header check.
    const block = await cachedGetBlock(client, receipt.blockNumber, blockCache);
    if (block.hash !== receipt.blockHash) {
      throw new Error(
        `Canonical block hash mismatch for block ${receipt.blockNumber}: ` +
          `canonical=${block.hash}, receipt=${receipt.blockHash} — possible reorg`
      );
    }
    if (block.number !== receipt.blockNumber) {
      throw new Error(
        `Block number mismatch for block ${receipt.blockNumber}: ` +
          `canonical=${block.number}, receipt=${receipt.blockNumber}`
      );
    }

    // 4e. Collect verified deal events from this receipt's logs.
    const matchingEvents: VerifiedDealEvent[] = [];

    for (const log of receipt.logs) {
      // Log membership consistency.
      if (log.removed) continue;
      if (log.transactionHash.toLowerCase() !== hash) {
        throw new Error(
          `Log transactionHash ${log.transactionHash} does not match receipt hash ${hash}`
        );
      }
      if (log.blockHash !== receipt.blockHash) {
        throw new Error(
          `Log blockHash ${log.blockHash} does not match receipt blockHash ${receipt.blockHash}`
        );
      }
      if (!Number.isSafeInteger(log.logIndex) || log.logIndex < 0) {
        throw new Error(`Log has negative logIndex ${log.logIndex} in receipt ${hash}`);
      }
      if (log.blockNumber !== receipt.blockNumber || log.transactionIndex !== receipt.transactionIndex
        || !Number.isSafeInteger(receipt.transactionIndex) || receipt.transactionIndex < 0) {
        throw new Error("Log position does not match receipt position.");
      }

      // Only logs from our escrow contract.
      if (log.address.toLowerCase() !== scope.escrow.toLowerCase()) continue;

      // Attempt to decode as a known Middleman event.
      let decoded: DecodedEvent;
      try {
        decoded = decodeEventLog({
          abi: middlemanAbi,
          topics: log.topics as [Hash, ...Hash[]],
          data: log.data,
          strict: true,
        });
      } catch {
        // Unrecognised event — ignore.
        continue;
      }

      // Filter by dealId — the first indexed arg is `id` for all Middleman events.
      const args = decoded.args as Record<string, unknown>;
      if (args["id"] !== scope.dealId) continue;

      matchingEvents.push({
        ...decoded,
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        transactionIndex: receipt.transactionIndex,
        logIndex: log.logIndex,
        timestamp: block.timestamp,
      });
    }

    // 4f. Advertised receipts with zero matching deal events fail explicitly.
    if (matchingEvents.length === 0) {
      throw new Error(
        `Receipt ${hash} was supplied as a candidate but contains no events for deal ${scope.dealId} at ${scope.escrow}`
      );
    }

    events.push(...matchingEvents);
  }

  // 5. Sort deterministically: block -> transactionIndex -> logIndex.
  //    Deduplicate by (blockHash, transactionHash, logIndex) — handles the
  //    edge case where the same hash appears in the input set.
  const seen = new Set<string>();
  const deduped: VerifiedDealEvent[] = [];
  for (const ev of events) {
    const key = `${ev.blockHash}:${ev.transactionHash}:${ev.logIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(ev);
    }
  }

  deduped.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber)
      return a.blockNumber < b.blockNumber ? -1 : 1;
    if (a.transactionIndex !== b.transactionIndex)
      return a.transactionIndex - b.transactionIndex;
    return a.logIndex - b.logIndex;
  });

  return deduped;
}

// ---------------------------------------------------------------------------
// Window reader
// ---------------------------------------------------------------------------

/**
 * Refuse ranges wider than MAX_WINDOW (2000) blocks, call getLogs with exact
 * escrow address and block range, collect candidate transaction hashes from
 * the results, then call verifyDealReceipts.
 *
 * IMPORTANT LIMITATIONS (documented, not hidden):
 *   - This window does NOT represent full deal history. The caller is
 *     responsible for paging getLogs across the deployment history.
 *   - Indexer completeness is never asserted; a missing hash is not an error
 *     here — use manually supplied hashes or an explorer fallback for full coverage.
 *   - Empty window output still validates chain ID.
 *
 * The function re-reads the canonical block hash for the toBlock after log
 * collection and fails if it changed, since getLogs does not
 * guarantee a consistent snapshot.
 */
export async function readDealEventWindow(
  client: ReceiptAdapterClient,
  scope: EvidenceScope
): Promise<VerifiedDealEvent[]> {
  validateScope(scope);

  const windowSize = scope.toBlock - scope.fromBlock + 1n;
  if (windowSize > MAX_WINDOW) {
    throw new Error(
      `Block range ${windowSize} exceeds the 2000-block limit for a single window. ` +
        `Page getLogs across multiple calls and combine the candidate hashes.`
    );
  }

  // Chain ID validated inside verifyDealReceipts; do it early for empty window.
  const liveChainId = await client.getChainId();
  if (liveChainId !== scope.chainId) {
    throw new Error(
      `Chain mismatch: client is on chain ${liveChainId}, scope requires ${scope.chainId}`
    );
  }

  // Snapshot the toBlock hash before fetching logs.
  const blockCache = new Map<bigint, BlockEntry>();
  const blockBefore = await cachedGetBlock(client, scope.toBlock, blockCache);

  // Fetch logs filtered by escrow address and block range.
  // Filter indexed deal IDs below before requesting any receipts.
  let rawLogs: Awaited<ReturnType<ReceiptAdapterClient["getLogs"]>>;
  try {
    rawLogs = await client.getLogs({
      address: scope.escrow,
      fromBlock: scope.fromBlock,
      toBlock: scope.toBlock,
    });
  } catch (err) {
    throw new Error(
      `getLogs failed for range [${scope.fromBlock}, ${scope.toBlock}]: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // Re-check canonical snapshot block hash after getLogs.
  const blockAfter = await client.getBlock({ blockNumber: scope.toBlock });
  if (blockAfter.hash !== blockBefore.hash) {
    throw new Error(
      `[receipt-adapter] Tip block hash changed during getLogs (possible reorg): ` +
        `before=${blockBefore.hash} after=${blockAfter.hash}. ` +
        `Reconcile before using this evidence.`
    );
  }

  // Extract unique non-null candidate hashes.
  const candidateHashes: Hash[] = [];
  const seen = new Set<string>();
  for (const log of rawLogs) {
    if (log.removed) continue;
    if (log.address.toLowerCase() !== scope.escrow.toLowerCase()
      || log.topics[1]?.toLowerCase() !== toHex(scope.dealId, { size: 32 })) continue;
    if (!log.transactionHash) continue;
    const h = log.transactionHash;
    if (!seen.has(h)) {
      seen.add(h);
      candidateHashes.push(h);
    }
  }

  if (candidateHashes.length === 0) {
    return [];
  }

  // Delegate to verifyDealReceipts — it re-validates chain ID and performs
  // all receipt/block/log consistency checks.
  return verifyDealReceipts(client, scope, candidateHashes);
}

// ---------------------------------------------------------------------------
// interpretDeal — pure ledger helper
// ---------------------------------------------------------------------------

/**
 * Input terms sufficient for ledger interpretation.
 * Mirrors the on-chain Deal struct fields used in payout/refund calculations.
 */
export interface DealTerms {
  mintCost: bigint;
  collateral: bigint;
  funderBps: number;
  salePrice: bigint;
  principalDeposited: boolean;
  /** True if collateral > 0 and deposited, OR if collateral === 0n (auto-deposited at proposal). */
  collateralDeposited: boolean;
}

/**
 * Lifecycle status mirrors the Solidity enum (index-matched).
 * Using a string union for clarity in TypeScript consumers.
 */
export type DealStatus =
  | "Proposed"
  | "Active"
  | "Funded"
  | "NFTLocked"
  | "Sold"
  | "Refunded"
  | "Cancelled";

export interface DealInterpretation {
  /**
   * Computed expected funder payout on a successful sale.
   * = mintCost + floor((salePrice - mintCost) * funderBps / 10000) if salePrice > mintCost,
   *   else mintCost.
   */
  computedFunderSalePayout: bigint;
  /**
   * Computed expected holder payout on a successful sale.
   * = salePrice + collateral - computedFunderSalePayout.
   */
  computedHolderSalePayout: bigint;

  /**
   * Computed amount of principal actually committed by the funder.
   * Zero if principalDeposited is false.
   */
  computedPrincipalDeposited: bigint;

  /**
   * Computed amount of collateral actually committed by the holder.
   * Zero if collateralDeposited is false (only possible when collateral > 0n).
   *
   * NOTE: zero collateral is marked deposited at proposal (collateralDeposited=true)
   * but NO CollateralDeposited event is emitted. This field will be 0n in both cases
   * when collateral is zero — use collateralDeposited to distinguish.
   */
  computedCollateralDeposited: bigint;

  /**
   * Computed amount currently reserved in escrow.
   * Zero after Sold, Refunded, or Cancelled (funds have left escrow).
   * Does not account for the mintCost that leaves escrow during mintAndLock.
   */
  computedCurrentlyReserved: bigint;

  /**
   * Computed principal spent (transferred to the DemoPass collection) on mintAndLock.
   * Only non-zero once status is NFTLocked or Sold.
   */
  computedPrincipalSpent: bigint;

  /**
   * Expected funder return on a timeout (deadline passed, not yet minted).
   * Fully funded: funder receives principal + collateral (penalty for non-delivery).
   * Incomplete funding: funder receives only their deposit, holder receives only theirs.
   */
  expectedFunderTimeoutReturn: bigint;
  /**
   * Expected holder return on a timeout (see above).
   */
  expectedHolderTimeoutReturn: bigint;

  /**
   * Expected return on cancellation (pre-full-funding or mutual post-funding).
   * Each party recovers only what they deposited.
   */
  expectedFunderCancellationReturn: bigint;
  expectedHolderCancellationReturn: bigint;

  /**
   * Post-mint risk flags (informational, not verified onchain state).
   */
  postMintRisk: {
    /**
     * No sale price change is possible after proposal.
     * Capital and collateral may remain locked indefinitely if no buyer appears.
     */
    noPriceChangeOrGuaranteedBuyer: true;
    /**
     * No cancellation path exists once the NFT is minted and locked.
     * No deadline refund is available post-mint.
     */
    noPostMintCancellationOrDeadlineRefund: true;
    /**
     * Any address (including a party to the deal) may call buy().
     */
    anyAddressMayBuy: true;
  };

  /**
   * Zero-collateral flag: when collateral is zero, collateralDeposited is set
   * true at proposal time and no CollateralDeposited event is emitted.
   */
  zeroCollateralAutoDeposited: boolean;

  /**
   * Proposed-then-Cancelled does NOT imply the deal was accepted.
   * cancel() is valid from Proposed status; no Accepted event was emitted.
   */
  preAcceptanceCancellationPossible: boolean;
}

/**
 * Pure function — no RPC calls. Derives ledger values from deal terms and
 * current status. Uses names that say "computed" or "expected", not
 * "verified payments", since these are derived from contract logic, not
 * from independently verified receipt evidence.
 *
 * Post-mint risk notes are always present and clearly labelled informational.
 */
export function interpretDeal(
  terms: DealTerms,
  status: DealStatus
): DealInterpretation {
  const { mintCost, collateral, funderBps, salePrice, principalDeposited, collateralDeposited } =
    terms;

  // Sale split (mirrors _payout in Middleman.sol)
  const { funder: computedFunderSalePayout, holder: computedHolderSalePayout } = payouts(mintCost, collateral, salePrice, funderBps);

  // Actual deposits
  const computedPrincipalDeposited = principalDeposited ? mintCost : 0n;
  // Zero collateral: collateralDeposited=true but amount is 0n
  const computedCollateralDeposited = collateralDeposited ? collateral : 0n;

  // Principal leaves escrow on mintAndLock (status NFTLocked or Sold)
  const principalSpentStatuses: DealStatus[] = ["NFTLocked", "Sold"];
  const computedPrincipalSpent =
    principalDeposited && principalSpentStatuses.includes(status) ? mintCost : 0n;

  // Currently reserved: zero after terminal states
  const terminalStatuses: DealStatus[] = ["Sold", "Refunded", "Cancelled"];
  let computedCurrentlyReserved: bigint;
  if (terminalStatuses.includes(status)) {
    computedCurrentlyReserved = 0n;
  } else if (status === "NFTLocked") {
    // Principal has been spent to mint; collateral remains
    computedCurrentlyReserved = computedCollateralDeposited;
  } else {
    computedCurrentlyReserved = computedPrincipalDeposited + computedCollateralDeposited;
  }

  // Timeout returns (mirrors claimRefund in Middleman.sol)
  // Fully funded (both deposited): funder gets principal + collateral; holder gets 0.
  // Incomplete funding: each party recovers their own deposit only.
  const { funder: expectedFunderTimeoutReturn, holder: expectedHolderTimeoutReturn } = returnedDeposits(mintCost, collateral, principalDeposited, collateralDeposited, true);

  // Cancellation returns (mirrors _cancel in Middleman.sol)
  // Each party recovers only their actual deposit.
  const expectedFunderCancellationReturn = computedPrincipalDeposited;
  const expectedHolderCancellationReturn = computedCollateralDeposited;

  return {
    computedFunderSalePayout,
    computedHolderSalePayout,
    computedPrincipalDeposited,
    computedCollateralDeposited,
    computedCurrentlyReserved,
    computedPrincipalSpent,
    expectedFunderTimeoutReturn,
    expectedHolderTimeoutReturn,
    expectedFunderCancellationReturn,
    expectedHolderCancellationReturn,
    postMintRisk: {
      noPriceChangeOrGuaranteedBuyer: true,
      noPostMintCancellationOrDeadlineRefund: true,
      anyAddressMayBuy: true,
    },
    zeroCollateralAutoDeposited: collateral === 0n,
    preAcceptanceCancellationPossible: status === "Cancelled" || status === "Proposed",
  };
}
