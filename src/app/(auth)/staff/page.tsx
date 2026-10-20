import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StaffSignInForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Staff sign in",
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
    <>
      <div className="flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-night text-gold-400">
          <ShieldCheck aria-hidden="true" />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Staff sign in</h1>
        <p className="mt-1 text-sm text-muted">KARIAKOO operations &amp; administration.</p>
      </div>
      <div className="mt-5">
        <StaffSignInForm />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Not staff?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
          Use the main sign in
        </Link>
      </p>
    </>
  );
}
