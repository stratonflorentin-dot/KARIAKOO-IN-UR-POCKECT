import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { DevRoleBar } from "@/components/auth/DevRoleBar";
import { RoleGate } from "@/components/auth/RoleGate";
import { Logo } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";
import type { Role } from "@/lib/types";
import { SidebarNav, type NavItem } from "./SidebarNav";

/** Sidebar dashboard used by the seller (light) and admin (dark) areas. */
export function DashboardFrame({ role, title, tone, nav, searchable, children }: {
  role: Role;
  title: string;
  tone: "light" | "dark";
  nav: NavItem[];
  searchable?: boolean;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div className="flex min-h-full flex-1 flex-col bg-subtle lg:flex-row">
      <aside className={`lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col ${dark ? "bg-night text-white" : "border-b border-line bg-white lg:border-b-0 lg:border-r"}`}>
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <div>
            <Logo tone={dark ? "light" : "dark"} href={`/${role}`} />
            <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${dark ? "text-brand-300" : "text-brand-700"}`}>{title}</p>
          </div>
          <Link href="/customer" className={`text-sm lg:hidden ${dark ? "text-white/70" : "text-muted"}`}>Store</Link>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto">
          {/* The nav reads the URL to highlight the active item, so it streams in. */}
          <Suspense fallback={<div className="mx-3 mb-3 h-11 rounded-xl bg-current/5 lg:h-96" />}>
            <SidebarNav items={nav} tone={tone} searchable={searchable} />
          </Suspense>
        </div>
        <div className={`hidden px-5 py-4 text-sm lg:block ${dark ? "text-white/60" : "text-muted"}`}>
          <Link href="/customer" className="hover:underline">← Back to store</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <DevRoleBar />
        </Suspense>
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <RoleGate role={role}>{children}</RoleGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
