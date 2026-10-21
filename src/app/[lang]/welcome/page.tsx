import { Bike, ChevronRight, Store, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).roles.pageTitle };
}

// Customers browse directly; sellers and riders apply for access. Admin is
// staff-only and has a separate sign-in entrance.
const roles = [
  { role: "customer", Icon: User, chip: "bg-brand-600 text-white", href: "/customer" },
  { role: "seller", Icon: Store, chip: "bg-gold-400 text-ink", href: "/apply/seller" },
  { role: "rider", Icon: Bike, chip: "bg-brand-600 text-white", href: "/apply/rider" },
] as const;

/** Role chooser (reference frame 2): customer, seller and rider entry points. */
export default async function WelcomePage() {
  const t = await getDictionary();
  return (
    <main id="main" className="flex min-h-full flex-1 flex-col bg-subtle px-4 pb-10 pt-5">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-4 flex justify-center">
          <Logo href="/" tagline size="lg" />
        </div>
        <h1 className="mt-8 text-center text-2xl font-bold tracking-tight">{t.roles.title}</h1>
        <p className="mt-1 text-center text-sm text-muted">{t.roles.subtitle}</p>

        <ul className="mt-6 space-y-3">
          {roles.map(({ role, Icon, chip, href }) => {
            const copy = t.roles[role];
            return (
              <li key={role}>
                <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${chip}`}>
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{copy.title}</span>
                    <span className="block text-sm font-semibold text-brand-700">{copy.alt}</span>
                    <span className="mt-0.5 block text-xs text-muted">{copy.body}</span>
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-10 text-center">
          <p className="text-sm text-muted">
            {t.roles.haveAccount}{" "}
            <Link href="/sign-in" className="font-semibold text-brand-700">{t.roles.login}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
