import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { fmt } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { getSessionWithRole } from "@/lib/auth/session";
import { liveCustomerOrder } from "@/lib/data/customer-live";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).orderHelp.metaTitle };
}

// Private, per-user order, so render per request and skip prerender validation.
export const instant = false;

export default function OrderHelpPage({ params }: PageProps<"/[lang]/customer/orders/[id]/help">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <RoleGate role="customer">
          <OrderHelp params={params} />
        </RoleGate>
      </Suspense>
    </div>
  );
}

async function OrderHelp({ params }: Pick<PageProps<"/[lang]/customer/orders/[id]/help">, "params">) {
  const { id } = await params;
  const t = await getDictionary();
  const h = t.orderHelp;
  const session = await getSessionWithRole("customer");
  const detail = await liveCustomerOrder(session, id);
  if (!detail) notFound();
  const order = detail.order;

  return (
    <div className="space-y-5">
      <Link href={`/customer/orders/${order.id}`} className="text-sm font-medium text-brand-700 hover:underline">
        ← {t.orderDetail.order} {order.reference}
      </Link>
      <Card aria-labelledby="report-heading">
        <CardHeader id="report-heading" title={h.title} subtitle={fmt(h.about, { ref: order.reference })} />
        <p className="text-sm text-muted">{h.bodyPre}<strong className="text-ink">{order.reference}</strong>{h.bodyPost}</p>
        {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? <a className="mt-4 inline-flex h-11 items-center rounded-full bg-night px-5 font-semibold text-white" href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}>{t.support.call}</a> : <p className="mt-3 text-sm text-muted">{t.support.notConfigured}</p>}
      </Card>
    </div>
  );
}
