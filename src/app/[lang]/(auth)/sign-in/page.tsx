import { Bike, Store, User } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/AuthForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "@/components/i18n/Link";
import { Notice } from "@/components/ui/States";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.signIn };
}

// Reads ?as= to show the customer, seller or rider login.
export const instant = false;

const LOGINS = {
  customer: { Icon: User, href: "/sign-up" },
  seller: { Icon: Store, href: "/apply/seller" },
  rider: { Icon: Bike, href: "/apply/rider" },
} as const;

type LoginRole = keyof typeof LOGINS;

export default async function SignInPage({ searchParams }: PageProps<"/[lang]/sign-in">) {
  const params = await searchParams;
  const t = await getDictionary();
  const as: LoginRole = params.as === "seller" || params.as === "rider" ? params.as : "customer";
  const copy = t.auth[as];
  const { Icon, href } = LOGINS[as];
  const loginRoles = Object.keys(LOGINS) as LoginRole[];

  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<Icon size={22} aria-hidden="true" />}>
      <nav aria-label="Sign in to a role" className="mb-5 grid grid-cols-3 gap-2">
        {loginRoles.map((role) => {
          const RoleIcon = LOGINS[role].Icon;
          const href = role === "customer" ? "/sign-in" : `/sign-in?as=${role}`;
          return <Link key={role} href={href} aria-current={role === as ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition sm:text-sm ${role === as ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line text-muted hover:border-brand-300 hover:text-ink"}`}>
            <RoleIcon size={16} aria-hidden="true" />{t.auth[role].title}
          </Link>;
        })}
      </nav>
      {params.error === "link" && (
        <div className="mb-4"><Notice tone="warning">{t.auth.linkExpired}</Notice></div>
      )}
      {params.error === "google" && (
        <div className="mb-4"><Notice tone="warning">{t.auth.googleFailed}</Notice></div>
      )}
      <GoogleSignInButton as={as} />
      <div className="my-4 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{t.auth.orWithEmail}<span className="h-px flex-1 bg-line" />
      </div>
      <SignInForm as={as} />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.footerLead}{" "}
        <Link href={href} className="font-semibold text-brand-700 hover:underline">{copy.footerLink}</Link>
      </p>
    </AuthShell>
  );
}
