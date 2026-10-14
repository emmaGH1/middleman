"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useEscrow } from "@/hooks/use-escrow";
import { useTransaction } from "@/hooks/use-transaction";
import { demoPassAbi } from "@/config/abi";
import { chain } from "@/config/contracts";
import { usdc } from "@/lib/deal";
import { AppFrame, ChainLink, TransactionStatus } from "./shared";

export function MintPass() {
  const { address } = useAccount();
  const deployment = useEscrow();
  const client = usePublicClient({ chainId: chain.id });
  const transaction = useTransaction();
  const [acknowledged, setAcknowledged] = useState(false);
  const eligibility = useQuery({
    queryKey: ["direct-eligibility", chain.id, deployment.data?.collection, address], enabled: !!client && !!deployment.data && !deployment.isError && !!address,
    queryFn: async () => {
      if (!client || !address || !deployment.data) throw new Error("Connect a wallet first.");
      const [allowed, minted] = await Promise.all([
        client.readContract({ address: deployment.data.collection, abi: demoPassAbi, functionName: "allowlisted", args: [address] }),
        client.readContract({ address: deployment.data.collection, abi: demoPassAbi, functionName: "minted", args: [address] }),
      ]);
      return { allowed, minted };
    }, refetchInterval: 4000,
  });
  return <AppFrame title="A spot with your name on it." eyebrow="DEMOPASS / THE COLLECTION">
    <div className="probe-body"><section><span className="mono">01 / ATOMIC MINTING</span><h2>In a deal?<br />Mint from the agreement.</h2><p className="reading-copy">The agreement’s “Mint & lock NFT” action spends the funder’s escrowed USDC and sends the NFT straight to escrow in the same transaction. No manual withdrawal or deposit.</p><Button asChild className="action-button primary-action"><Link href="/deals">Open your agreements ↗</Link></Button>
      <div className="probe-vault" aria-hidden="true"><pre>{"[ FUNDER USDC ]\n       │\n       ↓\n[ MINT + ESCROW ]\n       │\n       ↓\n[ NFT LOCKED ]"}</pre></div>
    </section><aside><span className="mono">02 / DIRECT MINT — NOT AN ESCROW DEAL</span><h2>Buying for yourself?</h2><p>This uses your own USDC and sends the NFT to your wallet. It consumes your one mint and can make an existing deal undeliverable, forfeiting its collateral. Do not use this for a funded agreement.</p>
      {deployment.data && <p className="mint-detail"><ChainLink path={`address/${deployment.data.collection}`}>DemoPass</ChainLink> / {usdc(deployment.data.mintCost)} USDC</p>}
      <p className="mono mint-detail">{!address ? "CONNECT TO CHECK ELIGIBILITY" : eligibility.isError ? "ELIGIBILITY UNAVAILABLE" : !eligibility.data ? "CHECKING ELIGIBILITY…" : eligibility.data.minted ? "MINT ALREADY USED" : eligibility.data.allowed ? "ALLOWLISTED / MINT AVAILABLE" : "NOT ALLOWLISTED"}</p>
      <label className="risk-checkbox"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>I am minting for myself, not fulfilling a Middleman deal.</span></label>
      <Button className="action-button" disabled={!transaction.ready || transaction.pending || !acknowledged || !eligibility.data?.allowed || eligibility.data.minted || eligibility.isError} onClick={() => { if (deployment.data) void transaction.run(deployment.data.collection, demoPassAbi, "mint", [], { spender: deployment.data.collection, amount: deployment.data.mintCost }); }}>Mint with my own USDC</Button>
      <TransactionStatus transaction={transaction} />
    </aside></div>
  </AppFrame>;
}
