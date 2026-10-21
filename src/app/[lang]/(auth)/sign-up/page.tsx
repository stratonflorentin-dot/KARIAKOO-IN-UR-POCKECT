import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForm";
import Link from "@/components/i18n/Link";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.signUp.pageTitle };
}

export default async function SignUpPage() {
  const t = await getDictionary();
  const copy = t.auth.signUp;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<UserPlus size={22} aria-hidden="true" />}>
      <SignUpForm />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.haveAccount}{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">{t.auth.signIn}</Link>
      </p>
    </AuthShell>
  );
}
