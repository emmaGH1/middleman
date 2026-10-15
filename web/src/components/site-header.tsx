import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="wordmark" aria-label="Middleman home"><span className="brand-mark" aria-hidden="true">[m]</span> middleman</Link>
    <nav aria-label="Main navigation">
      <Link href="/#how-it-works">How it works</Link>
      <Link href="/deals">Agreements</Link>
    </nav>
    <Button asChild variant="link" size={null} className="header-action rounded-none shadow-none"><Link href="/deals">Open app <span aria-hidden="true">→</span></Link></Button>
  </header>;
}
