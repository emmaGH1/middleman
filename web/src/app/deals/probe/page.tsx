import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const states = ["PROPOSED", "ACTIVE", "FUNDED", "NFT LOCKED", "SOLD"];

export default function DealProbe() {
  return <><SiteHeader /><main className="deal-probe">
    <Link href="/" className="mono back-link">← BACK TO MIDDLEMAN</Link>
    <div className="probe-heading"><div><span className="mono">THE AGREEMENT / DESIGN PROBE</span><h1>Nothing left<br />to a handshake.</h1></div><p>This is a layout preview, not a real deal. No wallet is connected and no funds can move.</p></div>
    <div className="state-machine" aria-label="Illustrative deal lifecycle; no live state">{states.map((state, index) => <div key={state}><span className="mono">0{index + 1}</span><strong>{state}</strong><span className="state-track" aria-hidden="true">[░░░░░░░░]</span></div>)}</div>
    <div className="probe-body"><section><span className="mono">01 / THE TERMS</span><h2>Two sides of the same deal.</h2><dl>{[["Whitelist holder", "Not connected"], ["USDC funder", "Not connected"], ["NFT collection", "Not selected"], ["Mint amount", "— USDC"], ["Holder collateral", "— USDC"], ["Profit split", "Not agreed"], ["Delivery deadline", "Not set"], ["Sale price", "— USDC"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><aside><span className="mono">02 / YOUR NEXT MOVE</span><h2>Terms first.<br />Transactions later.</h2><p>The live deal flow will appear here after the contract model is finalized and deployed.</p><div className="probe-vault" aria-hidden="true"><pre>{"┌───────────────────┐\n│   [ MIDDLEMAN ]   │\n│                   │\n│      ┌─ + ─┐      │\n│      └─────┘      │\n│                   │\n└───────────────────┘"}</pre></div><span className="mono">NO TRANSACTIONS / NO ESCROW BALANCE</span></aside></div>
    <p className="probe-disclaimer">Not audited. No mainnet deployment. This preview does not accept deposits or guarantee returns.</p>
  </main></>;
}
