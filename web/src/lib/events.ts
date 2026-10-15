import { toHex, type Hash, type PublicClient } from "viem";
import { chain, configured, deploymentBlock, escrowAddress } from "../config/contracts";
import { readDealEventWindow, verifyDealReceipts, type VerifiedDealEvent } from "./receipt-adapter";

export function candidateHashes(payload: unknown): { hashes: Hash[]; truncated: boolean } {
  if (!payload || typeof payload !== "object" || !("result" in payload)) throw new Error("Invalid explorer response.");
  const result = payload.result;
  if (!Array.isArray(result)) throw new Error("Explorer returned no usable log index.");
  if (result.length > 100) throw new Error("Explorer exceeded the requested page limit.");
  const hashes = result.map((row: unknown) => {
    if (!row || typeof row !== "object" || !("transactionHash" in row) || typeof row.transactionHash !== "string" || !/^0x[0-9a-f]{64}$/i.test(row.transactionHash)) throw new Error("Invalid explorer transaction hint.");
    return row.transactionHash.toLowerCase() as Hash;
  });
  return { hashes: [...new Set(hashes)], truncated: result.length === 100 };
}

export function mergeEvents(events: VerifiedDealEvent[]) {
  const unique = new Map(events.map(event => [`${event.blockHash}:${event.transactionHash}:${event.logIndex}`, event]));
  return [...unique.values()].sort((a, b) => a.blockNumber === b.blockNumber ? a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1);
}

export async function readDealHistory(client: PublicClient, id: bigint, snapshot: { blockNumber: bigint; blockHash: Hash }, before?: bigint, manual?: Hash) {
  if (!configured || !escrowAddress || deploymentBlock === undefined) throw new Error("No valid deployment configured.");
  if (await client.getChainId() !== chain.id) throw new Error("RPC chain mismatch.");
  const tip = before !== undefined && before < snapshot.blockNumber ? before : snapshot.blockNumber;
  if (tip < deploymentBlock) throw new Error("Snapshot precedes deployment.");
  const start = tip - deploymentBlock >= 1999n ? tip - 1999n : deploymentBlock;
  const scope = { chainId: chain.id, escrow: escrowAddress, dealId: id, fromBlock: deploymentBlock, toBlock: snapshot.blockNumber };
  let indexed: VerifiedDealEvent[] = [], indexAvailable = false, truncated = false;
  let discoveryWarning = "";
  if (before === undefined && chain.blockExplorers) {
    try {
      const url = new URL("/api", chain.blockExplorers.default.url);
      url.search = new URLSearchParams({ module: "logs", action: "getLogs", address: escrowAddress, fromBlock: deploymentBlock.toString(), toBlock: snapshot.blockNumber.toString(), topic1: toHex(id, { size: 32 }), page: "1", offset: "100" }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (!response.ok) throw new Error(`Explorer HTTP ${response.status}`);
      const candidates = candidateHashes(await response.json());
      indexed = await verifyDealReceipts(client, scope, candidates.hashes);
      truncated = candidates.truncated;
      indexAvailable = true;
    } catch {
      discoveryWarning = "Indexed history unavailable or failed verification. Showing the bounded RPC window only; older receipts may be missing.";
    }
  }
  const recent = await readDealEventWindow(client, { ...scope, fromBlock: start, toBlock: tip });
  const supplied = manual ? await verifyDealReceipts(client, scope, [manual]) : [];
  const canonical = await client.getBlock({ blockNumber: snapshot.blockNumber });
  if (canonical.hash !== snapshot.blockHash) throw new Error("State snapshot changed during receipt verification. Reconcile again.");
  return { events: mergeEvents([...indexed, ...recent, ...supplied]), blockNumber: snapshot.blockNumber, indexAvailable, truncated, discoveryWarning, fromBlock: start, toBlock: tip, hasOlder: start > deploymentBlock };
}
