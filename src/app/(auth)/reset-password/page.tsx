import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

/** Reached from the emailed reset link, after /auth/callback signs the user in. */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      greeting="Nenosiri jipya"
      intro="Choose a new password for your account."
      title="New password"
      subtitle="At least 8 characters"
      icon={<KeyRound size={22} aria-hidden="true" />}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
