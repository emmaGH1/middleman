"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { chain, escrowAddress, deploymentBlock } from "@/config/contracts";
import { middlemanAbi, demoPassAbi } from "@/config/abi";
import { useDeal } from "@/hooks/use-escrow";
import { useTransaction } from "@/hooks/use-transaction";
import { deadlineLabel, payouts, statuses, usdc } from "@/lib/deal";
import { AppFrame, ChainLink, TransactionStatus } from "./shared";
import { readDealEvents } from "@/lib/events";

export function DealView({ id }: { id: string }) {
  const dealId = BigInt(id);
  const { address } = useAccount();
  const query = useDeal(dealId);
  const transaction = useTransaction();
  const client = usePublicClient({ chainId: chain.id });
  const [historyBefore, setHistoryBefore] = useState<bigint>();
  const d = query.data?.deal;
  const eligibility = useQuery({
    queryKey: ["eligibility", chain.id, d?.nft, d?.holder], enabled: !!client && !!d,
    queryFn: async () => {
      if (!client || !d) throw new Error("No deal loaded.");
      const [allowed, minted] = await Promise.all([
        client.readContract({ address: d.nft, abi: demoPassAbi, functionName: "allowlisted", args: [d.holder] }),
        client.readContract({ address: d.nft, abi: demoPassAbi, functionName: "minted", args: [d.holder] }),
      ]);
      return allowed && !minted;
    }, refetchInterval: 4000,
  });
  const history = useQuery({
    queryKey: ["events", chain.id, escrowAddress, id, historyBefore?.toString()], enabled: !!client && !!d,
    queryFn: () => readDealEvents(client!, dealId, historyBefore), refetchInterval: historyBefore === undefined ? 10000 : false,
  });
  const holder = address?.toLowerCase() === d?.holder.toLowerCase();
  const funder = address?.toLowerCase() === d?.funder.toLowerCase();
  const party = holder || funder;
  const expired = !!d && (query.data?.timestamp ?? 0n) >= d.deliverBy;
  const blocked = !transaction.ready || transaction.pending || query.isError;
  const split = d ? payouts(d.mintCost, d.collateral, d.salePrice, d.funderBps) : undefined;
  const remaining = d && d.status < 4 ? (d.status < 3 && d.principalDeposited ? d.mintCost : 0n) + (d.collateralDeposited ? d.collateral : 0n) : 0n;
  const action = (fn: string, amount?: bigint) => {
    if (!escrowAddress) return;
    void transaction.run(escrowAddress, middlemanAbi, fn, [dealId], amount !== undefined ? { spender: escrowAddress, amount } : undefined);
  };

  return <AppFrame title="Nothing left to a handshake." eyebrow={`AGREEMENT / ${id}`}>
    {query.isLoading && <p className="empty-state mono">READING CONTRACT STATE…</p>}
    {query.isError && <p className="empty-state error" role="alert">Unable to read this deal. It may not exist on {chain.name}. {query.error.message}</p>}
    {d && <>
      <div className="deal-status mono" role="status">CURRENT STATE / {statuses[d.status]} {expired && d.status < 3 ? "· MINT DEADLINE REACHED" : ""}</div>
      <div className="state-machine" aria-label={`Deal lifecycle. Current state: ${statuses[d.status]}`}>
        {statuses.slice(0, 5).map((status, index) => <div key={status} className={d.status === index ? "current" : ""}><span className="mono">0{index + 1}</span><strong>{status}</strong><span className="state-track">{d.status <= 4 && d.status >= index ? "[████████]" : "[░░░░░░░░]"}</span></div>)}
      </div>
      <div className="probe-body"><section><span className="mono">01 / AGREED TERMS</span><h2>Two sides.<br />One set of rules.</h2><dl>
        <div><dt>Whitelist holder</dt><dd><ChainLink path={`address/${d.holder}`}>{d.holder}</ChainLink></dd></div>
        <div><dt>USDC funder</dt><dd><ChainLink path={`address/${d.funder}`}>{d.funder}</ChainLink></dd></div>
        <div><dt>NFT collection</dt><dd><ChainLink path={`address/${d.nft}`}>DemoPass</ChainLink>{d.tokenId > 0n ? ` / #${d.tokenId}` : ""}</dd></div>
        <div><dt>Mint principal</dt><dd>{usdc(d.mintCost)} USDC</dd></div>
        <div><dt>Holder collateral</dt><dd>{usdc(d.collateral)} USDC</dd></div>
        <div><dt>Funder profit share</dt><dd>{d.funderBps / 100}%</dd></div>
        <div><dt>Mint deadline / UTC</dt><dd>{deadlineLabel(d.deliverBy)}</dd></div>
        <div><dt>Fixed sale price</dt><dd>{usdc(d.salePrice)} USDC</dd></div>
        <div><dt>USDC reserved for this deal</dt><dd>{usdc(remaining)} USDC</dd></div>
      </dl><p className="action-help">Reserved USDC is derived from this deal’s onchain state, not the total pooled contract balance.</p>
      {split && <div className="settlement"><span className="mono">{d.status === 4 ? "SETTLED PAYOUTS" : "PAYOUTS IF SOLD AT AGREED PRICE"}</span><div><span>FUNDER</span><strong>{usdc(split.funder)} <small>USDC</small></strong></div><div><span>HOLDER</span><strong>{usdc(split.holder)} <small>USDC</small></strong></div><p>Holder amount includes remaining collateral. No platform fee.</p></div>}
      </section><aside><span className="mono">02 / YOUR NEXT MOVE</span><h2>{d.status === 4 ? "Settled. In code." : d.status === 3 ? "The NFT is locked." : "Every step, agreed."}</h2>
        {!address && <p>Connect a wallet to see its available actions.</p>}
        {d.status === 0 && <p>The counterparty must accept before either wallet deposits.</p>}
        {d.status === 1 && <p>Principal: {d.principalDeposited ? "deposited" : "not deposited"}. Collateral: {d.collateralDeposited ? "covered" : "not deposited"}.</p>}
        {d.status === 2 && <p>Minting pays DemoPass and locks the NFT in one transaction. No USDC is sent to the holder.</p>}
        {d.status < 3 && eligibility.data === false && <p className="error">The holder is not eligible for a new DemoPass mint. Do not fund until this is resolved. A failed mint cannot spend escrow principal.</p>}
        {d.status < 3 && eligibility.isError && <p className="error">Could not verify whitelist eligibility.</p>}
        {d.status === 3 && <p>No deadline refund remains. A buyer must pay the fixed price; the NFT and collateral stay locked until a sale.</p>}
        {d.status === 5 && <p>Timeout processed. Fully funded non-delivery pays principal and collateral to the funder; incomplete funding returns each actual deposit. See the refund receipt below.</p>}
        {d.status === 6 && <p>Agreement cancelled. Each deposited amount was returned to its original wallet.</p>}
        <div className="action-stack">
          {d.status === 0 && party && address?.toLowerCase() !== d.proposer.toLowerCase() && !expired && <Button className="action-button primary-action" disabled={blocked} onClick={() => action("accept")}>Accept these terms</Button>}
          {d.status === 1 && funder && !d.principalDeposited && !expired && <Button className="action-button primary-action" disabled={blocked || eligibility.data !== true || eligibility.isError} onClick={() => action("fund", d.mintCost)}>Fund {usdc(d.mintCost)} USDC</Button>}
          {d.status === 1 && holder && !d.collateralDeposited && !expired && <Button className="action-button primary-action" disabled={blocked || eligibility.data !== true || eligibility.isError} onClick={() => action("postCollateral", d.collateral)}>Post {usdc(d.collateral)} USDC collateral</Button>}
          {d.status === 2 && holder && !expired && <Button className="action-button primary-action" disabled={blocked || eligibility.data !== true || eligibility.isError} onClick={() => action("mintAndLock")}>Mint & lock NFT ↗</Button>}
          {d.status === 3 && address && <Button className="action-button primary-action" disabled={blocked} onClick={() => action("buy", d.salePrice)}>Buy for {usdc(d.salePrice)} USDC ↗</Button>}
          {d.status < 2 && party && <Button className="action-button" disabled={blocked} onClick={() => action("cancel")}>Cancel & return deposits</Button>}
          {d.status === 2 && party && !(d.cancelVotes & (holder ? 1 : 2)) && <Button className="action-button" disabled={blocked} onClick={() => action("agreeCancel")}>Agree to mutual cancellation</Button>}
          {(d.status === 1 || d.status === 2) && expired && party && <Button className="action-button refund-action" disabled={blocked} onClick={() => action("claimRefund")}>Process deadline refund</Button>}
        </div>
        {d.status === 2 && d.cancelVotes > 0 && <p className="action-help">One cancellation signature recorded. Both parties must agree; the holder can still mint before the deadline.</p>}
        {d.status < 4 && <p className="action-help">Deposits and purchases may require two wallet confirmations: exact USDC approval, then the action. Leave USDC for gas.</p>}
        <TransactionStatus transaction={transaction} />
        <div className="probe-vault" aria-hidden="true"><pre>{"┌───────────────────┐\n│   [ MIDDLEMAN ]   │\n│                   │\n│   TERMS → CODE    │\n│                   │\n└───────────────────┘"}</pre></div>
      </aside></div>
      <section className="receipt-list"><h2>Onchain receipts.</h2><p className="mono">{history.data ? `BLOCKS ${history.data.fromBlock}–${history.data.toBlock}` : `DEPLOYMENT BLOCK ${deploymentBlock}`} / PAGED IN 2,000-BLOCK WINDOWS</p>
        {history.isLoading && <p>Loading receipts…</p>}{history.isError && <p className="error">Receipt history unavailable. Use the contract explorer; no activity has been fabricated.</p>}
        {history.data?.logs.map(log => <div key={`${log.transactionHash}-${log.logIndex}`}><span className="mono">{log.eventName}</span><ChainLink path={`tx/${log.transactionHash}`}>{log.transactionHash}</ChainLink></div>)}
        {history.data?.logs.length === 0 && <p>No deal events in this block window.</p>}
        <div className="list-heading"><Button className="action-button" disabled={historyBefore === undefined || history.isFetching} onClick={() => setHistoryBefore(undefined)}>Latest receipts</Button><Button className="action-button" disabled={!history.data?.hasOlder || history.isFetching} onClick={() => { if (history.data) setHistoryBefore(history.data.fromBlock - 1n); }}>Older receipts</Button></div>
      </section>
    </>}
  </AppFrame>;
}
