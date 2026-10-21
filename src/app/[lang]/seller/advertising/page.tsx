import type { Metadata } from "next";
import { Megaphone, Trash2 } from "lucide-react";
import { PromotionComposer } from "@/components/dashboard/PromotionComposer";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, Notice } from "@/components/ui/States";
import { fmt } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { sellerPromotions } from "@/lib/data/promotions";
import { liveSellerProducts, liveSellerShop } from "@/lib/data/seller-live";
import { formatDateTime } from "@/lib/format";
import { deletePromotion } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dash.seller.advertising };
}

export default async function SellerAdvertisingPage() {
  const t = await getDictionary();
  const ad = t.advertising;
  const session = await requireRole("seller");
  const shop = await liveSellerShop(session);
  if (!shop) return <><PageHeader title={t.dash.seller.advertising} description={ad.noShopDesc} /><EmptyState title={t.seller.setUpFirst} body={ad.noShopBody} /></>;

  const [promotions, products] = await Promise.all([
    sellerPromotions(session, shop.id),
    liveSellerProducts(session, shop.id),
  ]);

  return <>
    <PageHeader title={t.dash.seller.advertising} description={ad.pageDesc} />
    {shop.status !== "approved" && <div className="mb-5"><Notice tone="warning">{ad.notApproved}</Notice></div>}
    <Card aria-labelledby="new-promotion">
      <CardHeader id="new-promotion" title={ad.createPromotion} subtitle={ad.createSubtitle} />
      {shop.status === "approved" ? <PromotionComposer products={products} /> : <p className="text-sm text-muted">{ad.prepareNote}</p>}
    </Card>
    <Card aria-labelledby="my-promotions" className="mt-6">
      <CardHeader id="my-promotions" title={ad.yourPromotions} subtitle={fmt(promotions.length === 1 ? ad.postsOne : ad.postsMany, { count: promotions.length })} />
      {promotions.length === 0 ? <EmptyState icon={<Megaphone size={22} />} title={ad.noPromotionsTitle} body={ad.noPromotionsBody} /> : (
        <ul className="divide-y divide-line">
          {promotions.map((promotion) => {
            // eslint-disable-next-line react-hooks/purity -- server render; "now" is the request time
            const expired = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() <= Date.now() : false;
            return <li key={promotion.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-800">{promotion.kind.replace("_", " ")}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? "bg-stone-100 text-stone-600" : "bg-emerald-50 text-emerald-800"}`}>{expired ? ad.expired : ad.visible}</span>
                </div>
                {promotion.title && <h3 className="mt-2 font-semibold">{promotion.title}</h3>}
                {promotion.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{promotion.body}</p>}
                {promotion.imageUrl && <a href={promotion.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand-700 underline">{ad.viewImage}</a>}
                <p className="mt-2 text-xs text-muted">{fmt(ad.published, { date: formatDateTime(promotion.createdAt) })}{promotion.expiresAt ? fmt(ad.endsSuffix, { date: formatDateTime(promotion.expiresAt) }) : ad.alwaysOn}</p>
              </div>
              <form action={deletePromotion}>
                <input type="hidden" name="id" value={promotion.id} />
                <Button type="submit" variant="outline" size="sm" aria-label={fmt(ad.deleteAria, { title: promotion.title ?? ad.noHeadline })}><Trash2 size={15} aria-hidden="true" /> {ad.delete}</Button>
              </form>
            </li>;
          })}
        </ul>
      )}
    </Card>
  </>;
}
