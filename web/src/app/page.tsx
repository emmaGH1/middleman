import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { EscrowArt } from "@/components/escrow-art";

const steps = [
  { number: "01", title: "Make the deal.", detail: "One wallet brings the spot. The other brings USDC. Agree on the mint, collateral, deadline, and split.", art: "[ HOLDER ] ── terms ── [ FUNDER ]", tag: "TWO WALLETS. SAME TERMS." },
  { number: "02", title: "Lock it in.", detail: "Commit USDC and collateral. Mint DemoPass straight into escrow in one transaction. If minting fails, the USDC stays put.", art: "[ USDC ] → [ MINT + NFT LOCK ]", tag: "NO WITHDRAWAL. NO DELIVERY GAP." },
  { number: "03", title: "Sell. Split. Settle.", detail: "A buyer pays the agreed price. The contract transfers the NFT and distributes proceeds by the agreed terms.", art: "[ SALE ] ──┬──→ [ FUNDER ]\n          └──→ [ HOLDER ]", tag: "NO CHASING YOUR SHARE." },
];

export default function Home() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-topline mono"><span>WHITELIST DEALS, REWRITTEN.</span><span>01 — THE CONNECTION</span></div>
        <div className="hero-copy">
          <h1 id="hero-heading">A spot. A backer.<br /><span>No leap of faith.</span></h1>
          <p className="hero-description">You have the whitelist. They have the USDC.<br />Put a contract between you.</p>
          <div className="hero-actions">
            <Button asChild variant="link" size={null} className="primary-link rounded-none shadow-none"><Link href="/deals/new">Start an agreement <span aria-hidden="true">→</span></Link></Button>
            <Link href="/deals" className="secondary-link">View agreements</Link>
          </div>
          <span className="preview-note mono">DEMOPASS ONLY · USDC ESCROW ON ARC</span>
        </div>
        <EscrowArt />
        <div className="hero-bottom mono"><span>TWO WALLETS. ONE AGREEMENT.</span><a href="#how-it-works">HOW IT WORKS <span aria-hidden="true">↓</span></a><a href="https://www.arc.io/" target="_blank" rel="noreferrer">BUILT ON ARC ↗</a></div>
      </section>
      <section id="how-it-works" className="how-section" aria-labelledby="how-heading">
        <div className="section-heading"><span className="mono">02 — THE AGREEMENT</span><h2 id="how-heading">Less “trust me.”<br />More set in code.</h2><p>From a handshake in your DMs<br />to terms you can both see.</p></div>
        <ol className="steps">{steps.map(step => <li key={step.number}><div className="step-number mono">[{step.number}]</div><div className="step-copy"><h3>{step.title}</h3><p>{step.detail}</p></div><div className="step-diagram"><pre>{step.art}</pre><span className="mono">{step.tag}</span></div></li>)}</ol>
        <div className="risk-note"><span className="mono">READ THE TERMS.</span><p>DemoPass-only atomic minting protects against non-delivery, not resale losses or lack of buyers. After minting, principal has bought an NFT and there is no deadline refund. Funds can remain locked indefinitely. Not audited; deployment status is shown inside the app.</p></div>
      </section>
    </main>
    <footer className="site-footer"><Link href="/" className="wordmark"><span className="brand-mark" aria-hidden="true">[m]</span> middleman</Link><span className="mono">THE CONTRACT IN BETWEEN.</span><a href="https://github.com/emmaGH1/middleman" target="_blank" rel="noreferrer" className="mono">SOURCE CODE ↗</a></footer>
  </>;
}
