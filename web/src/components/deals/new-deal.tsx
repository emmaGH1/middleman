"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { decodeEventLog } from "viem";
import { Button } from "@/components/ui/button";
import { AppFrame, ChainLink, TransactionStatus } from "./shared";
import { useEscrow } from "@/hooks/use-escrow";
import { useTransaction } from "@/hooks/use-transaction";
import { escrowAddress } from "@/config/contracts";
import { middlemanAbi } from "@/config/abi";
import { parseUSDC, payouts, usdc, validateCounterparty } from "@/lib/deal";

export function NewDeal() {
  const { address } = useAccount();
  const deployment = useEscrow();
  const transaction = useTransaction();
  const router = useRouter();
  const [role, setRole] = useState("holder");
  const [counterparty, setCounterparty] = useState("");
  const [collateral, setCollateral] = useState("");
  const [price, setPrice] = useState("");
  const [bps, setBps] = useState(6000);
  const [deadline, setDeadline] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  let preview: ReturnType<typeof payouts> | undefined;
  let termsError = "";
  if (deployment.data && collateral && price) {
    try { preview = payouts(deployment.data.mintCost, parseUSDC(collateral), parseUSDC(price), bps); }
    catch (e) { termsError = e instanceof Error ? e.message : "Invalid terms."; }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (!address || !escrowAddress || !deployment.data || !acknowledged) throw new Error("Connect a wallet and read the risk disclosure first.");
      const other = validateCounterparty(counterparty, address);
      if (other.toLowerCase() === escrowAddress.toLowerCase()) throw new Error("The escrow cannot be your counterparty.");
      const collateralAmount = parseUSDC(collateral), salePrice = parseUSDC(price);
      payouts(deployment.data.mintCost, collateralAmount, salePrice, bps);
      const deliverBy = Math.floor(new Date(deadline).getTime() / 1000);
      if (!Number.isSafeInteger(deliverBy) || deliverBy <= Date.now() / 1000) throw new Error("Choose a future delivery deadline.");
      const receipt = await transaction.run(escrowAddress, middlemanAbi, "propose", [role === "holder" ? address : other, role === "funder" ? address : other, collateralAmount, bps, BigInt(deliverBy), salePrice]);
      if (!receipt) return;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== escrowAddress.toLowerCase()) continue;
        try {
          const event = decodeEventLog({ abi: middlemanAbi, data: log.data, topics: log.topics });
          if (event.eventName === "Proposed") { router.push(`/deals/${event.args.id}`); return; }
        } catch { /* Other logs can belong to unrelated event signatures. */ }
      }
      setError("Confirmed, but the deal ID could not be read. Check My agreements before trying again.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid terms."); }
  }

  return <AppFrame title="Put it in writing." eyebrow="01 / NEW AGREEMENT">
    <form className="deal-form probe-body" onSubmit={submit}>
      <fieldset disabled={transaction.pending}>
        <span className="mono">THE TERMS / FIXED ONCE PROPOSED</span>
        <label>I am the<select value={role} onChange={e => setRole(e.target.value)}><option value="holder">Whitelist holder</option><option value="funder">USDC funder</option></select></label>
        <label>Counterparty wallet<input placeholder="0x…" value={counterparty} onChange={e => setCounterparty(e.target.value)} required autoComplete="off" spellCheck={false} /></label>
        <div className="field-readonly"><span>Collection</span>{deployment.data ? <ChainLink path={`address/${deployment.data.collection}`}>DemoPass · {deployment.data.collection}</ChainLink> : <span>DemoPass — awaiting deployment</span>}</div>
        <div className="field-readonly"><span>Mint cost / fixed by collection</span><strong>{deployment.data ? `${usdc(deployment.data.mintCost)} USDC` : "—"}</strong></div>
        <div className="form-pair"><label>Holder collateral / USDC<input inputMode="decimal" placeholder="0.00" value={collateral} onChange={e => setCollateral(e.target.value)} required /></label><label>Sale price / USDC<input inputMode="decimal" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} required /></label></div>
        <label>Funder share of profit · {bps / 100}%<input aria-label="Funder share of profit" type="range" min="0" max="10000" step="100" value={bps} onChange={e => setBps(Number(e.target.value))} /></label>
        <label>Mint deadline / your local time<input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} required /></label>
      </fieldset>
      <aside><span className="mono">THE PLAIN-LANGUAGE VERSION</span><h2>Agree first.<br />Move money second.</h2>
        {preview && deployment.data ? <p className="terms-preview">The funder puts in <strong>{usdc(deployment.data.mintCost)} USDC</strong>. The holder puts in <strong>{collateral} USDC</strong> collateral. On a sale at <strong>{price} USDC</strong>, the funder receives <strong>{usdc(preview.funder)} USDC</strong> and the holder receives <strong>{usdc(preview.holder)} USDC</strong>, including remaining collateral.</p> : <p>Enter the terms to calculate the exact split. These are proposed amounts, not live balances.</p>}
        {termsError && <p className="error" role="alert">{termsError}</p>}
        <div className="mint-rule mono">[ USDC ] → [ MINT + NFT CUSTODY ]<br />ONE TRANSACTION. OR NONE.</div>
        <label className="risk-checkbox"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} required /> <span>I understand that after minting there is no deadline refund, guaranteed buyer, or price change. Principal and collateral may remain locked indefinitely. Each holder can mint only once.</span></label>
        <Button type="submit" className="action-button primary-action" disabled={!transaction.ready || transaction.pending || !preview || !acknowledged}>{transaction.pending ? "Waiting for confirmation…" : "Propose agreement ↗"}</Button>
        <p className="action-help">Proposing moves no USDC. Your counterparty must accept these exact terms before deposits.</p>
        {error && <p role="alert" className="error">{error}</p>}<TransactionStatus transaction={transaction} />
      </aside>
    </form>
  </AppFrame>;
}
