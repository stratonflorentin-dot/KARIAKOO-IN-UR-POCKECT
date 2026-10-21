import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell
      greeting="Karibu Kariakoo!"
      intro="Create your account to start shopping."
      title="Create your account"
      subtitle="Join as a customer — become a seller or rider later"
      icon={<UserPlus size={22} aria-hidden="true" />}
    >
      <SignUpForm />
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
