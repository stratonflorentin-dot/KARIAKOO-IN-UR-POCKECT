import { Bike, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";
import { getSession } from "@/lib/auth/session";
import { clearDemoRole, setDemoRole } from "./actions";

export const metadata: Metadata = { title: "Role preview (development)", robots: { index: false, follow: false } };

const roles = [
  { role: "customer", title: "Customer", who: "Asha Mohamed", body: "Shop, cart, checkout preview, orders and delivery tracking.", Icon: ShoppingBag, accent: "bg-brand-600" },
  { role: "seller", title: "Business owner", who: "Msimbazi Mobile Hub", body: "Sales, orders, products, stock and commission breakdowns.", Icon: Store, accent: "bg-emerald-700" },
  { role: "rider", title: "Rider", who: "Hamisi Ally", body: "Delivery requests, active delivery, PIN confirmation and history.", Icon: Bike, accent: "bg-sky-700" },
  { role: "admin", title: "Admin / founder", who: "Founder (demo)", body: "Marketplace control centre: orders, shops, riders, commission.", Icon: ShieldCheck, accent: "bg-night" },
] as const;

export default function DevRolePreviewPage() {
  // In production builds this page does not exist.
  if (!DEMO_ROLE_PREVIEW_ENABLED) notFound();

  return (
    <main id="main" className="min-h-full flex-1 bg-subtle px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Logo />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Preview a role</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Local development only. Pick a demo identity to see that role&apos;s interface. Your choice is stored in an
          httpOnly cookie that the server checks on every request. This page and the cookie are both disabled in
          production builds.
        </p>
        <Suspense fallback={<p className="mt-4 h-6" />}>
          <CurrentRole />
        </Suspense>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {roles.map(({ role, title, who, body, Icon, accent }) => (
            <li key={role}>
              <form action={setDemoRole} className="h-full">
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="flex h-full w-full flex-col items-start gap-3 rounded-3xl border border-line bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${accent}`}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold">Preview as {title}</span>
                    <span className="block text-sm text-muted">Demo identity: {who}</span>
                  </span>
                  <span className="text-sm text-muted">{body}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

async function CurrentRole() {
  const session = await getSession();
  if (!session) return <p className="mt-4 text-sm text-muted">No role selected.</p>;
  return (
    <form action={clearDemoRole} className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <span>
        Currently previewing as <strong>{session.displayName}</strong> ({session.role}).
      </span>
      <button type="submit" className="rounded-full border border-line bg-white px-3 py-1.5 font-medium hover:border-brand-300">
        Clear role
      </button>
    </form>
  );
}
