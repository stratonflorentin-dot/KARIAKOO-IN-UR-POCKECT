import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { getSessionWithRole } from "@/lib/auth/session";
import { liveCustomerOrder } from "@/lib/data/customer-live";

export const metadata: Metadata = { title: "Report a problem" };

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
  const session = await getSessionWithRole("customer");
  const detail = await liveCustomerOrder(session, id);
  if (!detail) notFound();
  const order = detail.order;

  return (
    <div className="space-y-5">
      <Link href={`/customer/orders/${order.id}`} className="text-sm font-medium text-brand-700 hover:underline">
        ← Order {order.reference}
      </Link>
      <Card aria-labelledby="report-heading">
        <CardHeader id="report-heading" title="Report a problem" subtitle={`About order ${order.reference}`} />
        <p className="text-sm text-muted">Contact KARIAKOO support with reference <strong className="text-ink">{order.reference}</strong> so the team can review this order.</p>
        {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? <a className="mt-4 inline-flex h-11 items-center rounded-full bg-night px-5 font-semibold text-white" href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}>Call KARIAKOO support</a> : <p className="mt-3 text-sm text-muted">Support contact details have not been configured yet.</p>}
      </Card>
    </div>
  );
}
