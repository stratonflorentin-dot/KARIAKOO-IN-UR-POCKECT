import { Bike, Store, User } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/AuthForm";
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
  const others = (Object.keys(LOGINS) as LoginRole[]).filter((r) => r !== as);

  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<Icon size={22} aria-hidden="true" />}>
      {params.error === "link" && (
        <div className="mb-4"><Notice tone="warning">{t.auth.linkExpired}</Notice></div>
      )}
      <SignInForm as={as} />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.footerLead}{" "}
        <Link href={href} className="font-semibold text-brand-700 hover:underline">{copy.footerLink}</Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        {others.map((r, i) => (
          <span key={r}>
            {i > 0 && " · "}
            <Link href={r === "customer" ? "/sign-in" : `/sign-in?as=${r}`} className="font-medium text-ink underline-offset-2 hover:underline">
              {t.auth[r].title}
            </Link>
          </span>
        ))}
      </p>
    </AuthShell>
  );
}
