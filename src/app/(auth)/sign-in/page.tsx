import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your KARIAKOO account.</p>
      <div className="mt-5">
        <SignInForm />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
