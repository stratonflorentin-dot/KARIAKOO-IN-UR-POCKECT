import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { AvailabilityToggle } from "@/components/rider/AvailabilityToggle";
import { RiderNav } from "@/components/rider/RiderNav";
import { SafetyButton } from "@/components/rider/SafetyButton";
import { Logo } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";
import { getSession } from "@/lib/auth/session";
import { riderPresenceFor } from "@/lib/data/dispatch";

export const metadata: Metadata = {
  title: { default: "Rider", template: "%s · Rider · KARIAKOO" },
  robots: { index: false, follow: false },
};

// Every page in this area needs a signed-in session, so it is rendered per
// request. Opt out of build-time instant-navigation validation, which renders
// without a session (and would just see the access check's 404).
export const instant = false;

export default async function RiderLayout({ children }: LayoutProps<"/[lang]/rider">) {
  // A real rider gets the live availability controls; anyone else falls through
  // to the friendly RoleGate below instead of a bare 404.
  const session = await getSession();
  const rider = session?.role === "rider" ? session : null;
  const online = rider ? await riderPresenceFor(rider) : false;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-100">
      <header className="sticky top-0 z-30 bg-night text-white">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo tone="light" href="/rider" compact />
            <span className="text-sm font-bold tracking-wide">RIDER</span>
          </div>
          {rider && (
            <div className="flex items-center gap-2">
              <SafetyButton />
              <AvailabilityToggle initialOnline={online} />
            </div>
          )}
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
