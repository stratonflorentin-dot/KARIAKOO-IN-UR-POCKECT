import Link from "@/components/i18n/Link";
import { Suspense, type ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";
import { SignOutButton } from "@/components/auth/AccountControls";
import { getDictionary } from "@/i18n/server";
import type { Role } from "@/lib/types";
import { SidebarNav, type NavItem } from "./SidebarNav";

/** Sidebar dashboard used by the seller (light) and admin (dark) areas. */
export async function DashboardFrame({ role, title, tone, nav, searchable, children }: {
  role: Role;
  title: string;
  tone: "light" | "dark";
  nav: NavItem[];
  searchable?: boolean;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  const t = await getDictionary();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-50 lg:flex-row">
      <aside className={`lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col ${dark ? "border-b border-white/10 bg-gradient-to-b from-night to-[#102d23] text-white lg:border-b-0 lg:border-r" : "border-b border-stone-200 bg-white lg:border-b-0 lg:border-r"}`}>
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <div>
            <Logo tone={dark ? "light" : "dark"} href={`/${role}`} />
            <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${dark ? "text-brand-300" : "text-brand-700"}`}>{title}</p>
          </div>
          <div className="flex items-center gap-3 lg:mt-4">
            <LanguageSwitcher tone={dark ? "dark" : "light"} />
            <Link href="/customer" className={`text-sm lg:hidden ${dark ? "text-white/70" : "text-muted"}`}>{t.dash.store}</Link>
          </div>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto">
          {/* The nav reads the URL to highlight the active item, so it streams in. */}
          <Suspense fallback={<div className="mx-3 mb-3 h-11 rounded-xl bg-current/5 lg:h-96" />}>
            <SidebarNav items={nav} tone={tone} searchable={searchable} />
          </Suspense>
        </div>
        <div className={`hidden px-5 py-4 text-sm lg:block ${dark ? "text-white/60" : "text-muted"}`}>
          <Link href="/customer" className="hover:underline">{t.dash.backToStore}</Link>
        </div>
        {role === "admin" && (
          <div className="border-t border-white/10 px-4 py-4">
            <SignOutButton variant="glass" />
          </div>
        )}
      </aside>
      <div className="min-w-0 flex-1">
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
          <Suspense fallback={<PageSkeleton />}>
            <RoleGate role={role}>{children}</RoleGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
