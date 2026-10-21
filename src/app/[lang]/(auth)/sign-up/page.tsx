import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "@/components/i18n/Link";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.signUp.pageTitle };
}

export default async function SignUpPage({ searchParams }: PageProps<"/[lang]/sign-up">) {
  const params = await searchParams;
  const as = params.as === "seller" || params.as === "rider" ? params.as : "customer";
  const t = await getDictionary();
  const copy = t.auth.signUp;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<UserPlus size={22} aria-hidden="true" />}>
      <GoogleSignInButton as={as} />
      <div className="my-4 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{t.auth.orWithEmail}<span className="h-px flex-1 bg-line" />
      </div>
      <SignUpForm as={as} />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.haveAccount}{" "}
        <Link href={as === "customer" ? "/sign-in" : `/sign-in?as=${as}`} className="font-semibold text-brand-700 hover:underline">{t.auth.signIn}</Link>
      </p>
    </AuthShell>
  );
}
