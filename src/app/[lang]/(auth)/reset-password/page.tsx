import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/AuthForm";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.resetPage.pageTitle, robots: { index: false, follow: false } };
}

/** Reached from the emailed reset link, after /auth/callback signs the user in. */
export default async function ResetPasswordPage() {
  const copy = (await getDictionary()).auth.resetPage;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<KeyRound size={22} aria-hidden="true" />}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
