import Link from "@/components/i18n/Link";
import { Suspense, type ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";
import { SignOutButton } from "@/components/auth/AccountControls";
import { getDictionary } from "@/i18n/server";
import { SellerTabBar, type SellerTab } from "./SellerTabBar";

/**
 * Mobile-app shell for the seller area: a sticky app bar, a bottom tab bar on
 * phones (pill tabs on desktop), and card screens. Intentionally distinct from
 * the admin/rider sidebar DashboardFrame.
 */
export async function SellerAppShell({ title, tabs, children }: { title: string; tabs: SellerTab[]; children: ReactNode }) {
  const t = await getDictionary();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-50">
      {/* App bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Logo tone="dark" href="/seller" />
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher tone="light" />
            <Link href="/customer" className="hidden text-sm text-muted hover:underline sm:inline">{t.dash.store}</Link>
            <SignOutButton variant="outline" />
          </div>
        </div>
      </header>

      <SellerTabBar items={tabs} />

      {/* Card screens. Extra bottom padding clears the phone tab bar. */}
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10">
        <Suspense fallback={<PageSkeleton />}>
          <RoleGate role="seller">{children}</RoleGate>
        </Suspense>
      </main>
    </div>
  );
}
