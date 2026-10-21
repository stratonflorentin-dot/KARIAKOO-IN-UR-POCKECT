import type { Metadata } from "next";
import { Megaphone, Trash2 } from "lucide-react";
import { PromotionComposer } from "@/components/dashboard/PromotionComposer";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, Notice } from "@/components/ui/States";
import { requireRole } from "@/lib/auth/session";
import { sellerPromotions } from "@/lib/data/promotions";
import { liveSellerProducts, liveSellerShop } from "@/lib/data/seller-live";
import { formatDateTime } from "@/lib/format";
import { deletePromotion } from "./actions";

export const metadata: Metadata = { title: "Advertising" };

export default async function SellerAdvertisingPage() {
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
  if (!shop) return <><PageHeader title="Advertising" description="Promote your shop to customers browsing KARIAKOO." /><EmptyState title="Set up your shop first" body="Apply to sell and get your shop approved before publishing promotions." /></>;

  const [promotions, products] = await Promise.all([
    sellerPromotions(session, shop.id),
    liveSellerProducts(session, shop.id),
  ]);

  return <>
    <PageHeader title="Advertising" description="Create shop updates, product teasers, and introductions shown to customers in the KARIAKOO store." />
    {shop.status !== "approved" && <div className="mb-5"><Notice tone="warning">Your shop is {shop.status}. Promotions become visible to customers after approval.</Notice></div>}
    <Card aria-labelledby="new-promotion">
      <CardHeader id="new-promotion" title="Create a promotion" subtitle="Free shop content. Paid boosted placements are not enabled yet." />
      {shop.status === "approved" ? <PromotionComposer products={products} /> : <p className="text-sm text-muted">You can prepare products while your shop is reviewed. Publishing promotions is available after approval.</p>}
    </Card>
    <Card aria-labelledby="my-promotions" className="mt-6">
      <CardHeader id="my-promotions" title="Your promotions" subtitle={`${promotions.length} post${promotions.length === 1 ? "" : "s"}`} />
      {promotions.length === 0 ? <EmptyState icon={<Megaphone size={22} />} title="No promotions yet" body="Publish a shop update to introduce your business or highlight a product." /> : (
        <ul className="divide-y divide-line">
          {promotions.map((promotion) => {
            // eslint-disable-next-line react-hooks/purity -- server render; "now" is the request time
            const expired = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() <= Date.now() : false;
            return <li key={promotion.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-800">{promotion.kind.replace("_", " ")}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? "bg-stone-100 text-stone-600" : "bg-emerald-50 text-emerald-800"}`}>{expired ? "Expired" : "Visible"}</span>
                </div>
                {promotion.title && <h3 className="mt-2 font-semibold">{promotion.title}</h3>}
                {promotion.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{promotion.body}</p>}
                {promotion.imageUrl && <a href={promotion.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand-700 underline">View promotion image</a>}
                <p className="mt-2 text-xs text-muted">Published {formatDateTime(promotion.createdAt)}{promotion.expiresAt ? ` · ends ${formatDateTime(promotion.expiresAt)}` : " · always on"}</p>
              </div>
              <form action={deletePromotion}>
                <input type="hidden" name="id" value={promotion.id} />
                <Button type="submit" variant="outline" size="sm" aria-label={`Delete promotion ${promotion.title ?? "without headline"}`}><Trash2 size={15} aria-hidden="true" /> Delete</Button>
              </form>
            </li>;
          })}
        </ul>
      )}
    </Card>
  </>;
}
