"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AppFrame } from "./shared";
import { chain, escrowAddress } from "@/config/contracts";
import { middlemanAbi } from "@/config/abi";
import { useEscrow } from "@/hooks/use-escrow";
import { shortAddress, statuses, usdc } from "@/lib/deal";

export function DealList() {
  const { address } = useAccount();
  const deployment = useEscrow();
  const client = usePublicClient({ chainId: chain.id });
  const [page, setPage] = useState(0);
  const deals = useQuery({
    queryKey: ["deals", chain.id, escrowAddress, address, page], enabled: !!client && !!deployment.data && !deployment.isError && !!address,
    queryFn: async () => {
      if (!client || !escrowAddress || !address) throw new Error("Connect a wallet first.");
      const next = await client.readContract({ address: escrowAddress, abi: middlemanAbi, functionName: "nextDealId" });
      const end = next - 1n - BigInt(page * 20);
      const start = end > 19n ? end - 19n : 1n;
      const items = [];
      for (let id = end; id >= start; id--) {
        const deal = await client.readContract({ address: escrowAddress, abi: middlemanAbi, functionName: "getDeal", args: [id] });
        if ([deal.holder.toLowerCase(), deal.funder.toLowerCase()].includes(address.toLowerCase())) items.push({ id, deal });
      }
      return { items, hasOlder: start > 1n };
    }, refetchInterval: 15000,
  });
  return <AppFrame title="Your agreements." eyebrow="THE CONTRACT IN BETWEEN">
    <div className="list-heading"><p>Only deals where your connected wallet is holder or funder.</p><Button asChild className="action-button primary-action"><Link href="/deals/new">Start a deal ↗</Link></Button></div>
    {!address && <p className="empty-state">Connect your wallet to read its agreements. Nothing is stored offchain.</p>}
    {deals.isLoading && <p className="empty-state mono">READING AGREEMENTS…</p>}
    {deals.isError && <p className="empty-state error" role="alert">Could not load agreements. {deals.error.message}</p>}
    {deals.data?.items.length === 0 && <p className="empty-state">No agreements for this wallet in this page of 20 contract records.</p>}
    <div className="deal-list">{deals.data?.items.map(({ id, deal }) => <Link key={id.toString()} href={`/deals/${id}`}><span className="mono">#{id.toString()} / {statuses[deal.status]}</span><strong>{shortAddress(deal.holder)} <span>↔</span> {shortAddress(deal.funder)}</strong><span>{usdc(deal.mintCost)} USDC mint <span aria-hidden="true">↗</span></span></Link>)}</div>
    {address && <div className="list-heading"><Button className="action-button" disabled={page === 0 || deals.isFetching} onClick={() => setPage(p => p - 1)}>Newer records</Button><span className="mono">PAGE {page + 1}</span><Button className="action-button" disabled={!deals.data?.hasOlder || deals.isFetching} onClick={() => setPage(p => p + 1)}>Older records</Button></div>}
    <Link className="text-link mono" href="/mint">DEMO PASS / WHITELIST ELIGIBILITY ↗</Link>
  </AppFrame>;
}
