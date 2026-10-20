import { Bike, CreditCard, MessageCircle, PackageOpen, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Help centre" };

const topics = [
  { Icon: Bike, title: "Delivery", body: "Track your order, delivery times, and what the 4-digit PIN is for." },
  { Icon: CreditCard, title: "Payments", body: "How you pay KARIAKOO, cash on delivery, and when an order is marked paid." },
  { Icon: RotateCcw, title: "Returns & refunds", body: "Report a wrong or missing item and request a refund from your order." },
  { Icon: PackageOpen, title: "Orders", body: "Find an order, understand its status, and what happens at each step." },
];

/** Customer help centre: common topics and how to reach support. */
export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/customer" className="text-sm font-medium text-brand-700 hover:underline">← Home</Link>
      <div className="mt-4">
      <PageHeader title="How can we help?" description="Answers to common questions and help with an existing order." />
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
        <CardHeader id="report-heading" title="Problem with an order?" subtitle="Report it from the order itself so we have the details." />
        <Link
          href="/customer/orders"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50"
        >
          <PackageOpen size={16} className="shrink-0 text-brand-700" aria-hidden="true" /> Go to my orders
        </Link>
      </Card>

      <Card aria-labelledby="contact-heading" className="mt-6">
        <CardHeader id="contact-heading" title="Contact us" />
        <p className="flex gap-2 text-sm text-muted">
          <MessageCircle size={16} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? <a className="font-semibold text-brand-700 hover:underline" href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}>Call KARIAKOO support</a> : "Support contact details have not been configured yet."}
        </p>
      </Card>
    </div>
  );
}
