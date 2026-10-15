"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { chain, configured, escrowAddress, explorerPath } from "@/config/contracts";
import { useEscrow } from "@/hooks/use-escrow";
import { shortAddress } from "@/lib/deal";
import type { useTransaction } from "@/hooks/use-transaction";

export function WalletButton() {
  return <ConnectButton.Custom>{({ account, chain: walletChain, openAccountModal, openChainModal, openConnectModal, mounted }) =>
    <Button className="action-button" disabled={!mounted} onClick={!account ? openConnectModal : walletChain?.unsupported ? openChainModal : openAccountModal}>
      {!account ? "Connect wallet" : walletChain?.unsupported ? `Switch to ${chain.name}` : shortAddress(account.address)}
    </Button>
  }</ConnectButton.Custom>;
}

export function DeploymentNotice() {
  const deployment = useEscrow();
  if (!configured) return <div className="deployment-notice"><span className="mono">NOT CONFIGURED / TRANSACTIONS DISABLED</span><p>The network, contract address or deployment block is missing or invalid. These screens cannot accept deposits. Check the public deployment settings.</p></div>;
  if (deployment.isError) return <div className="deployment-notice error" role="alert">Cannot verify deployment: {deployment.error.message}. Transactions disabled.</div>;
  if (!deployment.data) return <div className="deployment-notice mono">VERIFYING {chain.name.toUpperCase()} DEPLOYMENT…</div>;
  return <div className="deployment-notice mono"><span>{chain.name.toUpperCase()} · NOT AUDITED</span> <ChainLink path={`address/${escrowAddress}`}>{escrowAddress}</ChainLink>{chain.id === 5042 && <p>Contracts deployed on mainnet. End-to-end deal testing was performed on testnet only. This is an unaudited demonstration, not a production-audited financial service.</p>}</div>;
}

export function ChainLink({ path, children }: { path: string; children: React.ReactNode }) {
  const href = explorerPath(path);
  return href ? <a className="chain-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a> : <span className="chain-link">{children} (local only)</span>;
}

export function AppFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <main className="deal-probe workspace"><div className="workspace-toolbar"><Link href="/deals" className="mono back-link">← MY AGREEMENTS</Link><WalletButton /></div>
    <div className="probe-heading"><div><span className="mono">{eyebrow}</span><h1>{title}</h1></div><p>One whitelist. Two signatures.<br />No money leaves without the NFT.</p></div>
    <DeploymentNotice />{children}
    <p className="probe-disclaimer">DemoPass only. Not audited. Failed minting keeps principal in escrow; after a successful mint, repayment depends on a buyer. Funds and collateral may remain locked indefinitely. USDC restrictions can prevent transfers.</p>
  </main>;
}

export function TransactionStatus({ transaction }: { transaction: ReturnType<typeof useTransaction> }) {
  return <div className="transaction-status" aria-live="polite">
    {transaction.message && <p>{transaction.message}</p>}
    {transaction.error && <p className="error" role="alert">{transaction.error}</p>}
    {transaction.hashes.map(hash => <div key={hash} className="mono"><ChainLink path={`tx/${hash}`}>{hash}</ChainLink></div>)}
  </div>;
}
