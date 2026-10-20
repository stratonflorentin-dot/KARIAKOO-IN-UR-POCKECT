import { Bike } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RiderApplyForm } from "@/components/apply/ApplyForms";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/States";
import { getSession } from "@/lib/auth/session";
import { deliveryZones } from "@/lib/delivery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Apply to ride for KARIAKOO" };

// Reads the signed-in session (cookies), so this route renders per request.
export const instant = false;

const STATUS_COPY: Record<string, { tone: "info" | "warning" | "success"; text: string }> = {
  pending: { tone: "warning", text: "Your rider application is under review. We'll let you know as soon as you're approved." },
  approved: { tone: "success", text: "You're approved. Go online in your rider area to start accepting jobs." },
  rejected: { tone: "warning", text: "Your application wasn't approved. Please contact support if you think this is a mistake." },
  suspended: { tone: "warning", text: "Your rider account is currently suspended. Please contact support." },
};

export default async function RiderApplyPage() {
  const session = await getSession();
  const signedIn = Boolean(session);

  let existing: { status: string } | null = null;
  if (signedIn) {
    const sb = await createSupabaseServerClient();
    const { data } = await sb.from("riders").select("status").eq("id", session!.userId).limit(1);
    const row = data?.[0] as { status?: string } | undefined;
    if (row?.status) existing = { status: row.status };
  }

  return (
    <main id="main" className="min-h-full flex-1 bg-subtle px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Logo href="/" />
        <span className="mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-gold-500 text-night"><Bike aria-hidden="true" /></span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Ride for KARIAKOO</h1>
        <p className="mt-2 text-muted">Accept delivery jobs across Dar es Salaam, follow pickup and drop-off, and earn. Tell us about your vehicle to get started.</p>

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
            <Notice tone={STATUS_COPY[existing.status]?.tone ?? "info"}>
              {STATUS_COPY[existing.status]?.text ?? "Your application has been received."}
            </Notice>
            <ButtonLink href="/rider" variant="dark">Go to your rider area</ButtonLink>
          </div>
        ) : (
          <RiderApplyForm zones={deliveryZones} />
        )}

        <p className="mt-8 text-sm text-muted">
          Want to sell instead?{" "}
          <Link href="/apply/seller" className="font-semibold text-brand-700 underline">Apply to sell</Link>.
        </p>
      </div>
    </main>
  );
}
