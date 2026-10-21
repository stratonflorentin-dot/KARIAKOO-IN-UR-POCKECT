import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { StaffSignInForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  // A private entrance: keep it out of search engines.
  robots: { index: false, follow: false },
};

/**
 * Dedicated staff / admin entrance, separate from the public customer sign-in.
 * Only users who already hold the `admin` role (granted server-side, never via
 * a form) reach the dashboard; everyone else is turned away by signInStaff.
 */
export default function StaffSignInPage() {
  return (
    <AuthShell
      greeting="Karibu Admin!"
      intro="Sign in to the KARIAKOO operations area."
      title="Admin Login"
      subtitle="Operations, oversight and decisions"
      icon={<ShieldCheck size={22} aria-hidden="true" />}
    >
      <StaffSignInForm />
      <p className="mt-5 text-center text-sm text-muted">Admin accounts are created by KARIAKOO. Contact your administrator for access.</p>
    </AuthShell>
  );
}
