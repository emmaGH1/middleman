import { decodeEventLog, type PublicClient } from "viem";
import { configured, deploymentBlock, escrowAddress } from "@/config/contracts";
import { middlemanAbi } from "@/config/abi";

export async function readDealEvents(client: PublicClient, id: bigint, before?: bigint) {
  if (!configured || !escrowAddress || deploymentBlock === undefined) throw new Error("No valid deployment configured.");
  const latest = before ?? await client.getBlockNumber();
  const start = latest >= deploymentBlock + 1999n ? latest - 1999n : deploymentBlock;
  const logs = [];
  for (let from = start; from <= latest; from += 2000n) {
    const to = from + 1999n < latest ? from + 1999n : latest;
    const chunk = await client.getLogs({ address: escrowAddress, fromBlock: from, toBlock: to });
    for (const log of chunk) {
      try {
        const decoded = decodeEventLog({ abi: middlemanAbi, data: log.data, topics: log.topics });
        if (decoded.args.id === id) logs.push({ ...log, eventName: decoded.eventName });
      } catch { /* Ignore events outside the escrow ABI. */ }
    }
  }
  return { logs, fromBlock: start, toBlock: latest, hasOlder: start > deploymentBlock };
}
