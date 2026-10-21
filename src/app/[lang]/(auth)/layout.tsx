import type { ReactNode } from "react";

/** Each sign-in screen renders its own branded AuthShell (photo header + card). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-full flex-1 flex-col">
      {children}
    </main>
  );
}
