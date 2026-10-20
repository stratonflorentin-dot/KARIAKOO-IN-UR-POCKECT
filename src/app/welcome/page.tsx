import { Bike, ShoppingBag, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Choose how you'll use KARIAKOO" };

// Customers browse directly; sellers and riders apply for access. Admin is
// staff-only and has a separate sign-in entrance.
const roles = [
  { role: "customer", title: "Customer", body: "Discover shops, order and pay securely, and track delivery.", Icon: ShoppingBag, accent: "bg-brand-600", href: "/customer" },
  { role: "seller", title: "Business / Seller", body: "List products, manage stock, confirm orders and see your earnings.", Icon: Store, accent: "bg-brand-800", href: "/apply/seller" },
  { role: "rider", title: "Rider", body: "Accept delivery jobs, follow pickup and drop-off, and earn.", Icon: Bike, accent: "bg-gold-500", href: "/apply/rider" },
] as const;

/**
 * Role chooser / onboarding for customer, seller, and rider entry points.
 */
export default function WelcomePage() {
  return (
    <main id="main" className="min-h-full flex-1 bg-subtle px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Logo href="/" tagline size="lg" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">How do you want to use KARIAKOO?</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Join Tanzania&apos;s trusted marketplace. Pick the experience that fits you — each role has its own tailored
          screens.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {roles.map(({ role, title, body, Icon, accent, href }) => (
              <li key={role}>
              <RoleCard href={href} title={title} body={body} Icon={Icon} accent={accent} />
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

        <p className="mt-10 border-t border-line pt-5 text-xs text-muted">
          KARIAKOO staff?{" "}
          <Link href="/staff" className="font-semibold text-ink underline">
            Admin sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function RoleCard({
  href,
  title,
  body,
  Icon,
  accent,
}: {
  href: string;
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

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}
