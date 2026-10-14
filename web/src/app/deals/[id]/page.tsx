import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DealView } from "@/components/deals/deal-view";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,77}$/.test(id) || BigInt(id) >= 1n << 256n) notFound();
  return <><SiteHeader /><DealView id={id} /></>;
}
