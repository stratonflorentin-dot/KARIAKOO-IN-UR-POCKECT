import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/AuthForm";
import Link from "@/components/i18n/Link";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.forgotPage.pageTitle };
}

export default async function ForgotPasswordPage() {
  const copy = (await getDictionary()).auth.forgotPage;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<KeyRound size={22} aria-hidden="true" />}>
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.remembered}{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">{copy.back}</Link>
      </p>
    </AuthShell>
  );
}
