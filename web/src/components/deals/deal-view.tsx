"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Hash } from "viem";
import { Button } from "@/components/ui/button";
import { chain, escrowAddress } from "@/config/contracts";
import { middlemanAbi } from "@/config/abi";
import { useDeal } from "@/hooks/use-escrow";
import { useTransaction } from "@/hooks/use-transaction";
import { useClock } from "@/hooks/use-clock";
import { deadlineLabel, shortAddress, statuses, usdc } from "@/lib/deal";
import { isFresh, mintRisk, permittedActions, roleFor, type DealAction } from "@/lib/deal-room";
import { interpretDeal, type DealStatus, type VerifiedDealEvent } from "@/lib/receipt-adapter";
import { readDealHistory } from "@/lib/events";
import { AppFrame, ChainLink, TransactionStatus } from "./shared";

const stateNames: DealStatus[] = ["Proposed", "Active", "Funded", "NFTLocked", "Sold", "Refunded", "Cancelled"];
const actionNames: Record<DealAction, string> = { accept: "Accept immutable terms", fund: "Deposit principal", postCollateral: "Post collateral", mintAndLock: "Mint & lock NFT", buy: "Buy & settle", cancel: "Cancel & return deposits", agreeCancel: "Agree to mutual cancellation", claimRefund: "Process deadline refund" };
const eventNames: Record<VerifiedDealEvent["eventName"], string> = { Proposed: "Agreement proposed", Accepted: "Terms accepted", PrincipalDeposited: "Principal deposited", CollateralDeposited: "Collateral deposited", Funded: "Funding complete", NFTLocked: "Minted into escrow", Sold: "Sold & settled", Refunded: "Deadline refund", CancellationAgreed: "Cancellation vote", Cancelled: "Agreement cancelled" };

function currentTimeMs() {
  return Date.now();
}

function eventDetail(event: VerifiedDealEvent) {
  switch (event.eventName) {
    case "Sold": case "Refunded": return `Funder ${usdc(event.args.funderPayout)} USDC · Holder ${usdc(event.args.holderPayout)} USDC`;
    case "PrincipalDeposited": case "CollateralDeposited": return `${usdc(event.args.amount)} USDC deposited`;
    case "NFTLocked": return `DemoPass #${event.args.tokenId} received by escrow`;
    case "CancellationAgreed": return `Vote by ${shortAddress(event.args.party)}`;
    case "Cancelled": return "Deposit returns follow the contract rules; this event contains no payout amounts.";
    default: return "Successful receipt · matching escrow and deal ID";
  }
}

export function DealView({ id }: { id: string }) {
  const dealId = BigInt(id);
  const { address } = useAccount();
  const query = useDeal(dealId);
  const transaction = useTransaction();
  const cache = useQueryClient();
  const client = usePublicClient({ chainId: chain.id });
  const now = useClock();
  const [historyBefore, setHistoryBefore] = useState<bigint>();
  const [manualInput, setManualInput] = useState("");
  const [manualHash, setManualHash] = useState<Hash>();
  const [acknowledged, setAcknowledged] = useState("");
  const [notice, setNotice] = useState("");
  const snapshot = query.data;
  const d = snapshot?.deal;
  const history = useQuery({
    queryKey: ["proof", chain.id, escrowAddress, id, historyBefore?.toString(), manualHash],
    enabled: !!client && !!snapshot && !query.isError,
    queryFn: () => readDealHistory(client!, dealId, snapshot!, historyBefore, manualHash),
    refetchInterval: historyBefore === undefined ? 15000 : false,
    retry: 1,
  });
  const events = history.isError ? [] : history.data?.events ?? [];
  const role = d ? roleFor(d, address) : "visitor";
  const fresh = !query.isError && isFresh(snapshot?.timestamp, query.dataUpdatedAt, now);
  const ledger = d ? interpretDeal(d, stateNames[d.status]) : undefined;
  const splitMatches = !!snapshot && !!ledger && snapshot.saleSplit[0] === ledger.computedFunderSalePayout && snapshot.saleSplit[1] === ledger.computedHolderSalePayout;
  const actions = d && snapshot ? permittedActions(d, snapshot.timestamp, address) : [];
  const eligible = snapshot?.allowed && !snapshot.minted;
  const ackKey = `${chain.id}:${id}:${address}:${d?.status}`;
  const needsRisk = actions.some(action => ["accept", "fund", "postCollateral", "mintAndLock", "buy"].includes(action));
  const payoutReceipt = events.find(event => (d?.status === 4 && event.eventName === "Sold") || (d?.status === 5 && event.eventName === "Refunded"));
  const evidencedPayout = payoutReceipt?.eventName === "Sold" || payoutReceipt?.eventName === "Refunded" ? payoutReceipt.args : undefined;
  const expected = d && ledger ? d.status === 5 ? [ledger.expectedFunderTimeoutReturn, ledger.expectedHolderTimeoutReturn]
    : d.status === 6 ? [ledger.expectedFunderCancellationReturn, ledger.expectedHolderCancellationReturn]
      : [ledger.computedFunderSalePayout, ledger.computedHolderSalePayout] : undefined;
  const receiptMatches = !evidencedPayout || !!expected && evidencedPayout.funderPayout === expected[0] && evidencedPayout.holderPayout === expected[1];
  const blocked = !transaction.ready || transaction.pending || !fresh || !splitMatches || !receiptMatches;

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("Copied."); }
    catch { setNotice("Clipboard unavailable. Copy the URL or visible proof details manually."); }
  }

  async function action(fn: DealAction) {
    setNotice("");
    if (!escrowAddress || blocked) return;
    const latest = await query.refetch();
    if (latest.isError || !latest.data || !isFresh(latest.data.timestamp, latest.dataUpdatedAt, currentTimeMs())
      || !permittedActions(latest.data.deal, latest.data.timestamp, address).includes(fn)) {
      setNotice("The deal changed or could not be refreshed. Review its current state before signing."); return;
    }
    const requiresEligibility = ["fund", "postCollateral", "mintAndLock"].includes(fn);
    if (requiresEligibility && (!latest.data.allowed || latest.data.minted)) { setNotice("The holder is not eligible for a new DemoPass mint."); return; }
    if (["accept", "fund", "postCollateral", "mintAndLock", "buy"].includes(fn) && acknowledged !== ackKey) return;
    const current = latest.data.deal;
    const amount = fn === "fund" ? current.mintCost : fn === "postCollateral" ? current.collateral : fn === "buy" ? current.salePrice : undefined;
    await transaction.run(escrowAddress, middlemanAbi, fn, [dealId], amount === undefined ? undefined : { spender: escrowAddress, amount });
  }

  const stageEvent = (name: VerifiedDealEvent["eventName"]) => events.find(event => event.eventName === name);
  const stages = d ? [
    { label: "Proposed", event: "Proposed" as const, done: true },
    { label: "Accepted", event: "Accepted" as const, done: d.status > 0 && d.status < 6 || !!stageEvent("Accepted") || d.principalDeposited || d.collateral > 0n && d.collateralDeposited },
    { label: "Principal", event: "PrincipalDeposited" as const, done: d.principalDeposited },
    { label: "Collateral", event: "CollateralDeposited" as const, done: d.collateralDeposited },
    { label: "NFT custody", event: "NFTLocked" as const, done: d.tokenId > 0n },
    { label: d.status === 5 ? "Refunded" : d.status === 6 ? "Cancelled" : "Settled", event: d.status === 5 ? "Refunded" as const : d.status === 6 ? "Cancelled" as const : "Sold" as const, done: d.status >= 4 },
  ] : [];

  return <AppFrame title="The deal, in full view." eyebrow={`DEAL ROOM / ${id}`}>
    <div className="room-tools"><p className="mono">{chain.name.toUpperCase()} / CHAIN {chain.id} / {role === "visitor" ? "READ-ONLY VISITOR" : `CONNECTED AS ${role.toUpperCase()}`}</p><div><Button className="action-button" onClick={() => void copy(window.location.href)}>Copy deal link</Button><Button className="action-button" disabled={query.isFetching || history.isFetching} onClick={() => void cache.invalidateQueries()}>Refresh / reconcile</Button></div></div>
    {notice && <p className="action-help" role="status">{notice}</p>}
    {query.isLoading && <p className="empty-state mono">READING CONTRACT STATE…</p>}
    {query.isError && <p className="empty-state error" role="alert">Unable to read this deal on {chain.name}. {query.error.message} Cached information, if shown, cannot authorize transactions.</p>}
    {d && snapshot && ledger && expected && <>
      <header className="room-summary"><div><span className="mono">ONCHAIN STATE</span><h2>{statuses[d.status]}</h2></div><div><span className="mono">FIXED BUYER COST</span><strong>{usdc(d.salePrice)} <small>USDC + gas</small></strong></div><div><span className="mono">ESCROW RESERVE / DERIVED</span><strong>{usdc(ledger.computedCurrentlyReserved)} <small>USDC</small></strong></div></header>
      <p className={`room-freshness mono ${fresh ? "" : "error"}`} role="status">{fresh ? "LIVE READ" : "STALE / ACTIONS PAUSED"} · BLOCK {snapshot.blockNumber.toString()} · {deadlineLabel(snapshot.timestamp)} · {query.isFetching ? "REFRESHING" : "POLLS EVERY 4s"}</p>
      {(!splitMatches || !receiptMatches) && <p className="error" role="alert">Payout evidence does not reconcile with the contract. Actions paused.</p>}
      <ol className="room-lifecycle" aria-label="Deal lifecycle from current contract state">
        {stages.map((stage, index) => {
          const event = stageEvent(stage.event);
          const zeroCollateral = stage.event === "CollateralDeposited" && d.collateral === 0n;
          return <li key={stage.label} className={stage.done ? "is-done" : ""}><span className="mono">0{index + 1} / {stage.done ? "[■]" : "[ ]"}</span><h3>{stage.label}</h3>{event ? <ChainLink path={`tx/${event.transactionHash}`}><time dateTime={new Date(Number(event.timestamp) * 1000).toISOString()}>{deadlineLabel(event.timestamp)}</time></ChainLink> : <span>{zeroCollateral ? "Zero collateral required; no deposit event." : stage.done ? "Confirmed by state. Receipt not loaded." : d.status >= 4 ? "Not established by loaded evidence." : "Not yet reached."}</span>}</li>;
        })}
      </ol>
      <div className="probe-body room-body"><section><span className="mono">01 / IMMUTABLE AGREEMENT</span><h2>Who brings what.</h2><dl>
        <div><dt>Whitelist holder</dt><dd><ChainLink path={`address/${d.holder}`}>{d.holder}</ChainLink></dd></div>
        <div><dt>USDC funder</dt><dd><ChainLink path={`address/${d.funder}`}>{d.funder}</ChainLink></dd></div>
        <div><dt>DemoPass collection</dt><dd><ChainLink path={`address/${d.nft}`}>{d.nft}</ChainLink></dd></div>
        <div><dt>Principal / funder</dt><dd>{usdc(d.mintCost)} USDC</dd></div>
        <div><dt>Collateral / holder</dt><dd>{usdc(d.collateral)} USDC</dd></div>
        <div><dt>Funder profit share</dt><dd>{d.funderBps / 100}%</dd></div>
        <div><dt>Mint deadline</dt><dd>{deadlineLabel(d.deliverBy)}</dd></div>
        <div><dt>Buyer pays</dt><dd>{usdc(d.salePrice)} USDC + gas</dd></div>
        <div><dt>Platform fee</dt><dd>0 USDC</dd></div>
      </dl><p className="action-help">Network gas is additional and shown by your wallet before signing. Approval and action may each cost gas. ERC-20 USDC uses 6 decimals; native gas accounting uses 18.</p>
      <div className="settlement"><span className="mono">{d.status >= 5 ? "COMPUTED RETURN UNDER CONTRACT RULES" : d.status === 4 ? "COMPUTED SALE DISTRIBUTION" : "EXPECTED PAYOUT IF SOLD"}</span><div><span>FUNDER</span><strong>{usdc(expected[0])} <small>USDC</small></strong></div><div><span>HOLDER</span><strong>{usdc(expected[1])} <small>USDC</small></strong></div><p>{d.status >= 5 ? "Returns depend on actual deposits and the cancellation or timeout path. Receipt-backed amounts appear separately below." : "Funder principal first, then the agreed profit share rounded down to 0.000001 USDC. The holder receives the remainder, including remaining collateral. Sale amounts match the contract’s salePayout getter."}</p></div>
      <h2>Follow the USDC.</h2><dl>
        <div><dt>Principal deposited</dt><dd>{usdc(ledger.computedPrincipalDeposited)} USDC</dd></div>
        <div><dt>Collateral deposited</dt><dd>{usdc(ledger.computedCollateralDeposited)} USDC</dd></div>
        <div><dt>Spent on minting</dt><dd>{usdc(ledger.computedPrincipalSpent)} USDC</dd></div>
        <div><dt>Purchase consideration</dt><dd>{d.status === 4 ? usdc(d.salePrice) : "0"} USDC</dd></div>
        <div><dt>Still reserved</dt><dd>{usdc(ledger.computedCurrentlyReserved)} USDC</dd></div>
      </dl><p className="action-help">Derived from this deal’s contract state, not the pooled escrow balance. Mint spending buys the NFT; it is not a holder payout. Refunds and cancellations involve no sale.</p>
      {d.status < 3 && <details className="room-rules"><summary>Cancellation & deadline outcomes</summary><p>Before full funding, either party can cancel. Once fully funded, both must agree. Cancellation returns deposits: funder {usdc(ledger.expectedFunderCancellationReturn)} USDC, holder {usdc(ledger.expectedHolderCancellationReturn)} USDC.</p><p>For an active or funded deal after the deadline, either party can process a refund. With the current deposits: funder {usdc(ledger.expectedFunderTimeoutReturn)} USDC, holder {usdc(ledger.expectedHolderTimeoutReturn)} USDC. Fully funded non-delivery sends collateral to the funder. A proposed deal must be cancelled instead.</p></details>}
      </section><aside className="room-action"><span className="mono">02 / NEXT MOVE</span><h2>{d.status === 4 ? "Settled onchain." : d.status === 3 ? "Waiting for a buyer." : d.status >= 5 ? "This deal is closed." : role === "visitor" ? "Read first. Connect later." : `Your move, ${role}.`}</h2>
        <p>{d.status === 0 ? "The counterparty must accept the immutable terms before deposits." : d.status === 1 ? "Each party deposits its contribution. Either can cancel before both deposits are covered." : d.status === 2 ? "The holder can mint before the deadline. Payment to DemoPass and NFT custody happen atomically." : d.status === 3 ? "Any wallet may buy at the fixed price. The contract transfers the NFT and distributes proceeds in the same transaction." : d.status === 4 ? "Sale state is confirmed. Inspect the receipt-backed distribution and current NFT owner below." : d.status === 5 ? "Deadline refund processed. No NFT was minted for this deal." : "Cancelled. The contract returned each actual deposit to its original wallet."}</p>
        {d.status < 3 && <p className="action-help">Holder eligibility: {eligible ? "allowlisted and unused" : snapshot.minted ? "already minted; another mint is not permitted" : "not allowlisted"}. Only the <ChainLink path={`address/${snapshot.allowlistOwner}`}>DemoPass owner</ChainLink> manages the allowlist. One mint per holder.</p>}
        <div className="room-risk"><span className="mono">READ BEFORE AUTHORIZING</span><p>{mintRisk}</p><p>DemoPass only, not arbitrary NFT drops. Unaudited contracts; USDC transfer restrictions may prevent payouts.</p></div>
        {needsRisk && <label className="risk-checkbox"><input type="checkbox" checked={acknowledged === ackKey} onChange={event => setAcknowledged(event.target.checked ? ackKey : "")} /><span>I have reviewed the amounts, gas costs and post-mint lock-up risk.</span></label>}
        <div className="action-stack">{actions.map(fn => {
          const sensitive = ["accept", "fund", "postCollateral", "mintAndLock", "buy"].includes(fn);
          const needsEligibility = ["fund", "postCollateral", "mintAndLock"].includes(fn);
          const amount = fn === "fund" ? d.mintCost : fn === "postCollateral" ? d.collateral : fn === "buy" ? d.salePrice : undefined;
          return <Button key={fn} className={`action-button ${sensitive ? "primary-action" : ""}`} disabled={blocked || sensitive && acknowledged !== ackKey || needsEligibility && !eligible} onClick={() => void action(fn)}>{actionNames[fn]}{amount !== undefined ? ` · ${usdc(amount)} USDC` : ""}</Button>;
        })}</div>
        {!address && <p className="action-help">This room is public and read-only. Connect a wallet above to see its permitted actions.</p>}
        {address && actions.length === 0 && <p className="action-help">No action is available to this wallet in the current state.</p>}
        {needsRisk && acknowledged !== ackKey && <p className="action-help">Acknowledge the risk disclosure to enable eligible actions.</p>}
        {!fresh && <p className="action-help">Fresh state is required before signing. Check your connection and refresh.</p>}
        {d.status === 2 && d.cancelVotes > 0 && <p className="action-help">A cancellation vote is recorded. Both parties must agree; the holder can still mint before the deadline.</p>}
        {d.status < 4 && <p className="action-help">USDC approval is not a deposit. You may see two separate wallet requests: approval, then the deal action. Leave USDC for gas.</p>}
        <TransactionStatus transaction={transaction} />
        <pre className="room-vault" aria-hidden="true">{"┌──────────────────────┐\n│  ACCESS ⇄ [ USDC ]    │\n│      MIDDLEMAN        │\n│  TERMS · CUSTODY      │\n└──────────────────────┘"}</pre>
      </aside></div>
      <section className="room-proof" aria-labelledby="proof-heading"><div className="room-proof-heading"><div><span className="mono">03 / RECEIPT & PROVENANCE</span><h2 id="proof-heading">Proof, not a promise.</h2></div><Button className="action-button" onClick={() => void copy([`Middleman deal ${id} | ${chain.name} (${chain.id})`, `Escrow: ${escrowAddress}`, `State: ${statuses[d.status]} at block ${snapshot.blockNumber}`, `NFT: ${d.tokenId || "not minted"}; owner: ${snapshot.owner ?? "not applicable"}`, evidencedPayout && receiptMatches ? `Receipt payouts: funder ${usdc(evidencedPayout.funderPayout)}, holder ${usdc(evidencedPayout.holderPayout)} USDC` : "Payout receipt not verified in this view; see computed amounts separately.", "Sources: RPC getDeal/salePayout/ownerOf; canonical-block checked receipts. Indexed history may be incomplete.", ...events.map(event => `${event.eventName}: ${event.transactionHash}`), window.location.href].join("\n"))}>Copy receipt summary</Button></div>
        <p className="room-proof-label mono">{chain.name.toUpperCase()} / CHAIN {chain.id} / {chain.id === 5042 ? "MAINNET DEAL READS, NOT A CLAIM OF TESTED MAINNET SETTLEMENT" : chain.id === 5042002 ? "TESTNET EVIDENCE ONLY · NO REAL-FUND SETTLEMENT CLAIM" : "LOCAL ONLY · NOT ARC EVIDENCE"}</p>
        <dl className="proof-facts"><div><dt>Escrow / source of truth</dt><dd><ChainLink path={`address/${escrowAddress}`}>{escrowAddress}</ChainLink></dd></div><div><dt>State read</dt><dd>getDeal + salePayout at block {snapshot.blockNumber.toString()}</dd></div><div><dt>NFT token / current owner</dt><dd>{snapshot.owner ? <>DemoPass #{d.tokenId.toString()} / <ChainLink path={`address/${snapshot.owner}`}>{snapshot.owner}</ChainLink><br />ownerOf at the state-read block; ownership may change after a sale.</> : "Not minted for this deal"}</dd></div><div><dt>Receipt-backed distribution</dt><dd>{evidencedPayout && receiptMatches ? <>Funder {usdc(evidencedPayout.funderPayout)} USDC · Holder {usdc(evidencedPayout.holderPayout)} USDC</> : "Not verified in the loaded receipts. Computed amounts above are separate."}</dd></div></dl>
        <p className="action-help">Receipts are checked against the configured RPC’s chain ID, successful status, escrow/deal IDs and canonical block hashes. Timestamps come from block headers. This relies on the RPC and is not independent consensus verification or a guarantee of finality.</p>
        {history.isFetching && <p className="mono" role="status">DISCOVERING & VERIFYING RECEIPTS…</p>}
        {history.isError && <p className="error" role="alert">Receipt verification unavailable: {history.error.message}. No receipts are presented as verified until this succeeds.</p>}
        {history.data && !history.isError && <p className="action-help">{history.data.indexAvailable ? "Explorer-indexed history plus the latest RPC window. Indexer completeness is not guaranteed." : `RPC blocks ${history.data.fromBlock}–${history.data.toBlock} only. This is not full lifetime history.`} Evidence checked through block {history.data.blockNumber.toString()}. {history.data.discoveryWarning} {history.data.truncated && "The index page reached its 100-log cap; history is incomplete."}</p>}
        <ol className="proof-events">{events.map(event => <li key={`${event.blockHash}:${event.transactionHash}:${event.logIndex}`}><div><span className="mono">{deadlineLabel(event.timestamp)}</span><h3>{eventNames[event.eventName]}</h3><p>{eventDetail(event)}</p></div><div><ChainLink path={`tx/${event.transactionHash}`}>{event.transactionHash}</ChainLink><span className="mono">BLOCK {event.blockNumber.toString()} / LOG {event.logIndex}</span></div></li>)}</ol>
        {!history.isFetching && !history.isError && events.length === 0 && <p className="action-help">No verified events found in this discovery window. This does not mean the deal has no history.</p>}
        <div className="room-tools"><Button className="action-button" disabled={historyBefore === undefined || history.isFetching} onClick={() => setHistoryBefore(undefined)}>Indexed / latest history</Button><Button className="action-button" disabled={!history.data?.hasOlder || history.isFetching} onClick={() => { if (history.data) setHistoryBefore(history.data.fromBlock - 1n); }}>Older RPC window</Button></div>
        <form className="receipt-lookup" onSubmit={event => { event.preventDefault(); if (/^0x[0-9a-f]{64}$/i.test(manualInput)) { setManualHash(manualInput as Hash); setNotice(""); } else setNotice("Enter a complete 0x transaction hash (64 hex characters)."); }}><label htmlFor="receipt-hash">Missing a receipt? Verify a known transaction hash.</label><div><input id="receipt-hash" placeholder="0x…" value={manualInput} onChange={event => setManualInput(event.target.value.trim())} autoComplete="off" spellCheck={false} /><Button className="action-button" type="submit" disabled={history.isFetching}>Verify hash</Button>{manualHash && <Button className="action-button" type="button" onClick={() => { setManualHash(undefined); setManualInput(""); }}>Clear</Button>}</div></form>
      </section>
    </>}
  </AppFrame>;
}
