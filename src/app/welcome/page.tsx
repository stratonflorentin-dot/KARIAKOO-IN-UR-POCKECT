import { Bike, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/States";
import { setDemoRole } from "@/app/dev/actions";
import { DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";

export const metadata: Metadata = { title: "Choose how you'll use KARIAKOO" };

const roles = [
  { role: "customer", title: "Customer", body: "Discover shops, order and pay securely, and track delivery.", Icon: ShoppingBag, accent: "bg-brand-600" },
  { role: "seller", title: "Business / Seller", body: "List products, manage stock, confirm orders and see your earnings.", Icon: Store, accent: "bg-brand-800" },
  { role: "rider", title: "Rider", body: "Accept delivery jobs, follow pickup and drop-off, and earn.", Icon: Bike, accent: "bg-gold-500" },
  { role: "admin", title: "Admin / Founder", body: "Oversee orders, shops, riders and commission across the market.", Icon: ShieldCheck, accent: "bg-night" },
] as const;

/**
 * Role chooser / onboarding. Real accounts are a later phase, so in local
 * development this previews each role through the demo identity; in production
 * it explains that secure sign-in is on the way and lets people browse as a guest.
 */
export default function WelcomePage() {
  return (
    <main id="main" className="min-h-full flex-1 bg-subtle px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Logo href="/" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">How do you want to use KARIAKOO?</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Join Tanzania&apos;s trusted marketplace. Pick the experience that fits you — each role has its own tailored
          screens.
        </p>

        {!DEMO_ROLE_PREVIEW_ENABLED && (
          <div className="mt-5">
            <Notice tone="info">
              Secure accounts and login are being built. For now you can browse the marketplace as a guest; choosing a
              role will open its preview once accounts are live.
            </Notice>
          </div>
        )}

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {roles.map(({ role, title, body, Icon, accent }) => (
            <li key={role}>
              <RoleCard role={role} title={title} body={body} Icon={Icon} accent={accent} />
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-muted">
          Just looking?{" "}
          <Link href="/customer" className="font-semibold text-brand-700 underline">
            Browse the marketplace as a guest
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function RoleCard({
  role,
  title,
  body,
  Icon,
  accent,
}: {
  role: string;
  title: string;
  body: string;
  Icon: typeof ShoppingBag;
  accent: string;
}) {
  const inner = (
    <>
      <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${accent}`}>
        <Icon aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted">{body}</span>
      </span>
    </>
  );
  const cardClass =
    "flex h-full w-full flex-col items-start gap-3 rounded-3xl border border-line bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg";

  // In development, selecting a role sets the demo identity and opens that area.
  if (DEMO_ROLE_PREVIEW_ENABLED) {
    return (
      <form action={setDemoRole} className="h-full">
        <input type="hidden" name="role" value={role} />
        <button type="submit" className={cardClass}>
          {inner}
        </button>
      </form>
    );
  }
  // In production, the role areas are gated until accounts ship; link through
  // so the role's own lock screen explains what's coming.
  return (
    <Link href={`/${role}`} className={cardClass}>
      {inner}
    </Link>
  );
}
