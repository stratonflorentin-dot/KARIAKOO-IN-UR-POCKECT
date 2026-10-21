import { Bike } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { RiderApplyForm } from "@/components/apply/ApplyForms";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { deliveryZones } from "@/lib/delivery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).apply.riderMeta };
}

// Reads the signed-in session (cookies), so this route renders per request.
export const instant = false;

const STATUS_TONE: Record<string, "info" | "warning" | "success"> = { pending: "warning", approved: "success", rejected: "warning", suspended: "warning" };

export default async function RiderApplyPage() {
  const t = await getDictionary();
  const a = t.apply;
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
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{a.riderTitle}</h1>
        <p className="mt-2 text-muted">{a.riderIntro}</p>

        {!signedIn ? (
          <div className="mt-6 space-y-4">
            <Notice tone="info">{a.needAccount}</Notice>
            <div className="flex gap-3">
              <ButtonLink href="/sign-up" variant="dark">{a.createAccount}</ButtonLink>
              <ButtonLink href="/sign-in" variant="outline">{a.signIn}</ButtonLink>
            </div>
          </div>
        ) : existing ? (
          <div className="mt-6 space-y-4">
            <Notice tone={STATUS_TONE[existing.status] ?? "info"}>
              {a.riderStatus[existing.status as keyof typeof a.riderStatus] ?? a.received}
            </Notice>
            <ButtonLink href="/rider" variant="dark">{a.goRiderArea}</ButtonLink>
          </div>
        ) : (
          <RiderApplyForm zones={deliveryZones} />
        )}

        <p className="mt-8 text-sm text-muted">
          {a.wantSell}{" "}
          <Link href="/apply/seller" className="font-semibold text-brand-700 underline">{a.applySell}</Link>.
        </p>
      </div>
    </main>
  );
}
