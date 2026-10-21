import { Bike, CreditCard, MessageCircle, PackageOpen, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).support.metaTitle };
}

/** Customer help centre: common topics and how to reach support. */
export default async function SupportPage() {
  const s = (await getDictionary()).support;
  const topics = [
    { Icon: Bike, title: s.deliveryT, body: s.deliveryB },
    { Icon: CreditCard, title: s.paymentsT, body: s.paymentsB },
    { Icon: RotateCcw, title: s.returnsT, body: s.returnsB },
    { Icon: PackageOpen, title: s.ordersT, body: s.ordersB },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/customer" className="text-sm font-medium text-brand-700 hover:underline">← {s.home}</Link>
      <div className="mt-4">
        <PageHeader title={s.title} description={s.subtitle} />
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {topics.map(({ Icon, title, body }) => (
          <li key={title}>
            <Card>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Card>
          </li>
        ))}
      </ul>

      <Card aria-labelledby="report-heading" className="mt-6">
        <CardHeader id="report-heading" title={s.problemTitle} subtitle={s.problemSub} />
        <Link
          href="/customer/orders"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50"
        >
          <PackageOpen size={16} className="shrink-0 text-brand-700" aria-hidden="true" /> {s.goToOrders}
        </Link>
      </Card>

      <Card aria-labelledby="contact-heading" className="mt-6">
        <CardHeader id="contact-heading" title={s.contact} />
        <p className="flex gap-2 text-sm text-muted">
          <MessageCircle size={16} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? <a className="font-semibold text-brand-700 hover:underline" href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}>{s.call}</a> : s.notConfigured}
        </p>
      </Card>
    </div>
  );
}
