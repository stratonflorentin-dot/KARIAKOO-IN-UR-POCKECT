import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { StaffSignInForm } from "@/components/auth/AuthForm";
import { getDictionary, getLocale } from "@/i18n/server";
import { getSessionWithRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { localizePath } from "@/i18n/config";

// Staff sessions are request-specific, so this route must not be prerendered.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDictionary()).auth.admin.pageTitle,
    // A private entrance: keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

/**
 * Dedicated staff / admin entrance, separate from the public customer sign-in.
 * Only users who already hold the `admin` role (granted server-side, never via
 * a form) reach the dashboard; everyone else is turned away by signInStaff.
 */
export default async function StaffSignInPage() {
  if (await getSessionWithRole("admin")) redirect(localizePath(await getLocale(), "/admin"));
  const copy = (await getDictionary()).auth.admin;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<ShieldCheck size={22} aria-hidden="true" />}>
      <StaffSignInForm />
      <p className="mt-5 text-center text-sm text-muted">{copy.note}</p>
    </AuthShell>
  );
}
