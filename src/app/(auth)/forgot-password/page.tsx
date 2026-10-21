import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      greeting="Umesahau nenosiri?"
      intro="No problem — we'll email you a reset link."
      title="Reset your password"
      subtitle="Enter the email you signed up with"
      icon={<KeyRound size={22} aria-hidden="true" />}
    >
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
