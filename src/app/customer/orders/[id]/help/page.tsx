import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { ReportIssueForm } from "@/components/orders/ReportIssueForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { getSessionWithRole } from "@/lib/auth/session";
import { customerOrder } from "@/lib/data/access";

export const metadata: Metadata = { title: "Report a problem" };

// Private, per-user order, so render per request and skip prerender validation.
export const instant = false;

export default function OrderHelpPage({ params }: PageProps<"/customer/orders/[id]/help">) {
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

async function OrderHelp({ params }: Pick<PageProps<"/customer/orders/[id]/help">, "params">) {
  const { id } = await params;
  const session = await getSessionWithRole("customer");
  const order = customerOrder(session, id);
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <Link href={`/customer/orders/${order.id}`} className="text-sm font-medium text-brand-700 hover:underline">
        ← Order {order.reference}
      </Link>
      <Card aria-labelledby="report-heading">
        <CardHeader id="report-heading" title="Report a problem" subtitle={`About order ${order.reference}`} />
        <ReportIssueForm orderId={order.id} />
      </Card>
    </div>
  );
}
