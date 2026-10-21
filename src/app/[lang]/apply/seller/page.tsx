import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { SellerApplyForm } from "@/components/apply/ApplyForms";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getCategories } from "@/lib/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).apply.sellerMeta };
}

// Reads the signed-in session (cookies), so this route renders per request.
export const instant = false;

const STATUS_TONE: Record<string, "info" | "warning" | "success"> = { pending: "warning", approved: "success", rejected: "warning", suspended: "warning" };

export default async function SellerApplyPage() {
  const t = await getDictionary();
  const a = t.apply;
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
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{a.sellerTitle}</h1>
        <p className="mt-2 text-muted">{a.sellerIntro}</p>

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
            <p className="text-sm text-muted">{a.applicationFor} <strong className="text-ink">{existing.name}</strong></p>
            <Notice tone={STATUS_TONE[existing.status] ?? "info"}>
              {a.sellerStatus[existing.status as keyof typeof a.sellerStatus] ?? a.received}
            </Notice>
            <ButtonLink href="/seller" variant="dark">{a.goSellerArea}</ButtonLink>
          </div>
        ) : (
          <SellerApplyForm categories={getCategories()} />
        )}

        <p className="mt-8 text-sm text-muted">
          {a.wantDeliver}{" "}
          <Link href="/apply/rider" className="font-semibold text-brand-700 underline">{a.applyRide}</Link>.
        </p>
      </div>
    </main>
  );
}
