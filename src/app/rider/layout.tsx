import type { Metadata } from "next";
import { Suspense } from "react";
import { DevRoleBar } from "@/components/auth/DevRoleBar";
import { RoleGate } from "@/components/auth/RoleGate";
import { AvailabilityToggle } from "@/components/rider/AvailabilityToggle";
import { RiderNav } from "@/components/rider/RiderNav";
import { Logo } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";

export const metadata: Metadata = {
  title: { default: "Rider", template: "%s · Rider · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default function RiderLayout({ children }: LayoutProps<"/rider">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-100">
      <Suspense fallback={null}>
        <DevRoleBar />
      </Suspense>
      <header className="sticky top-0 z-30 bg-night text-white">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo tone="light" href="/rider" compact />
            <span className="text-sm font-bold tracking-wide">RIDER</span>
          </div>
          <AvailabilityToggle />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-5">
        <Suspense fallback={<PageSkeleton />}>
          <RoleGate role="rider">{children}</RoleGate>
        </Suspense>
      </main>
      <Suspense fallback={<div className="fixed inset-x-0 bottom-0 h-16 bg-night" />}>
        <RiderNav />
      </Suspense>
    </div>
  );
}
