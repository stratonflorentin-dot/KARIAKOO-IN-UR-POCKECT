import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SellerApplyForm } from "@/components/apply/ApplyForms";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/States";
import { getSession } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Apply to sell on KARIAKOO" };

// Reads the signed-in session (cookies), so this route renders per request.
export const instant = false;

const STATUS_COPY: Record<string, { tone: "info" | "warning" | "success"; text: string }> = {
  pending: { tone: "warning", text: "Your shop is under review. We'll let you know as soon as it's approved — you can set up products in the meantime." },
  approved: { tone: "success", text: "Your shop is approved and live to customers." },
  rejected: { tone: "warning", text: "Your application wasn't approved. Please contact support if you think this is a mistake." },
  suspended: { tone: "warning", text: "Your shop is currently suspended. Please contact support." },
};

export default async function SellerApplyPage() {
  const session = await getSession();
  const signedIn = Boolean(session);

  // Already applied? Show the current status instead of the form.
  let existing: { name: string; status: string } | null = null;
  if (signedIn) {
    const sb = await createSupabaseServerClient();
    const { data } = await sb.from("shops").select("name,status").eq("owner_id", session!.userId).limit(1);
    const row = data?.[0] as { name?: string; status?: string } | undefined;
    if (row?.name && row.status) existing = { name: row.name, status: row.status };
  }

  return (
    <main id="main" className="min-h-full flex-1 bg-subtle px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Logo href="/" />
        <span className="mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-800 text-white"><Store aria-hidden="true" /></span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Sell on KARIAKOO</h1>
        <p className="mt-2 text-muted">List your products, manage stock, confirm orders and get paid. Tell us about your business to get started.</p>

        {!signedIn ? (
          <div className="mt-6 space-y-4">
            <Notice tone="info">You need a KARIAKOO account to apply. It&apos;s free and takes a minute.</Notice>
            <div className="flex gap-3">
              <ButtonLink href="/sign-up" variant="dark">Create an account</ButtonLink>
              <ButtonLink href="/sign-in" variant="outline">Sign in</ButtonLink>
            </div>
          </div>
        ) : existing ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">Application for <strong className="text-ink">{existing.name}</strong></p>
            <Notice tone={STATUS_COPY[existing.status]?.tone ?? "info"}>
              {STATUS_COPY[existing.status]?.text ?? "Your application has been received."}
            </Notice>
            <ButtonLink href="/seller" variant="dark">Go to your seller area</ButtonLink>
          </div>
        ) : (
          <SellerApplyForm categories={getCategories()} />
        )}

        <p className="mt-8 text-sm text-muted">
          Want to deliver instead?{" "}
          <Link href="/apply/rider" className="font-semibold text-brand-700 underline">Apply to ride</Link>.
        </p>
      </div>
    </main>
  );
}
