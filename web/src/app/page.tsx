import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { EscrowArt } from "@/components/escrow-art";

const steps = [
  { number: "01", title: "Make the deal.", detail: "One wallet brings the spot. The other brings USDC. Agree on the mint, collateral, deadline, and split.", art: "[ HOLDER ] ── terms ── [ FUNDER ]", tag: "TWO WALLETS. SAME TERMS." },
  { number: "02", title: "Lock it in.", detail: "Commit funds and collateral. The holder mints, then deposits the NFT into the contract before the deadline.", art: "[ USDC + COLLATERAL ] → [ NFT ]", tag: "THE AGREEMENT BECOMES CODE." },
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
          <div className="hero-aside"><p>You have the whitelist.<br />They have the USDC.<br />Put a contract between you.</p><Button asChild variant="link" size={null} className="primary-link rounded-none shadow-none focus-visible:ring-0 active:translate-y-0"><Link href="/deals/probe">Explore a deal <span aria-hidden="true">↗</span></Link></Button><span className="preview-note mono">DESIGN PREVIEW · NOT DEPLOYED</span></div>
        </div>
        <EscrowArt />
        <div className="hero-bottom mono"><span>TWO WALLETS. ONE AGREEMENT.</span><a href="#how-it-works">SCROLL TO UNDERSTAND <span aria-hidden="true">↓</span></a><span>USDC / NFT / ARC</span></div>
      </section>
      <section id="how-it-works" className="how-section" aria-labelledby="how-heading">
        <div className="section-heading"><span className="mono">02 — THE AGREEMENT</span><h2 id="how-heading">Less “trust me.”<br />More set in code.</h2><p>From a handshake in your DMs<br />to terms you can both see.</p></div>
        <ol className="steps">{steps.map(step => <li key={step.number}><div className="step-number mono">[{step.number}]</div><div className="step-copy"><h3>{step.title}</h3><p>{step.detail}</p></div><div className="step-diagram"><pre>{step.art}</pre><span className="mono">{step.tag}</span></div></li>)}</ol>
        <div className="risk-note"><span className="mono">READ THE TERMS.</span><p>Collateral is not a guarantee of principal. Funds withdrawn for a mint are no longer in escrow. Protection depends on the final contract terms. No contracts are deployed in this preview.</p></div>
      </section>
    </main>
    <footer className="site-footer"><Link href="/" className="wordmark"><span className="brand-mark" aria-hidden="true">[m]</span> middleman</Link><span className="mono">THE CONTRACT IN BETWEEN.</span><a href="https://github.com/emmaGH1/middleman" target="_blank" rel="noreferrer" className="mono">SOURCE CODE ↗</a></footer>
  </>;
}
