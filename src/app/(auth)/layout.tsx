import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/** Centered, branded shell for the sign-in / sign-up screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-stone-50 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(44rem_18rem_at_50%_-20%,rgba(5,150,105,0.16),transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="kk-auth-logo flex justify-center">
          <Logo href="/" tagline size="lg" />
        </div>
        <div className="kk-auth-card mt-7 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-lg shadow-stone-950/[0.045] sm:p-7">{children}</div>
      </div>
    </main>
  );
}
