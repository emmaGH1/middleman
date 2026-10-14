import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="wordmark" aria-label="Middleman home"><span className="brand-mark" aria-hidden="true">[m]</span> middleman</Link>
    <nav aria-label="Main navigation">
      <Link href="/#how-it-works">How it works <span>↗</span></Link>
      <Link href="/deals/probe">The agreement <span>↗</span></Link>
    </nav>
    <a className="network-link mono" href="https://www.arc.io/" target="_blank" rel="noreferrer">BUILT FOR ARC <span>↗</span></a>
  </header>;
}
