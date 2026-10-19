import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/** Centered, branded shell for the sign-in / sign-up screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-full flex-1 flex-col items-center justify-center bg-subtle px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
