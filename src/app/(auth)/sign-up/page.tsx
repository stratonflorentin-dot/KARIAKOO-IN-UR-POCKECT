import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Join KARIAKOO as a customer. You can become a seller or rider later.</p>
      <div className="mt-5">
        <SignUpForm />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
