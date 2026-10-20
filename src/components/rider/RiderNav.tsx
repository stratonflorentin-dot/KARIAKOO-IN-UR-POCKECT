"use client";

import { Bike, History, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/rider", label: "Deliveries", Icon: Bike, exact: true },
  { href: "/rider/earnings", label: "Earnings", Icon: Wallet },
  { href: "/rider/history", label: "History", Icon: History },
  { href: "/rider/profile", label: "Profile", Icon: User },
];

/** Big, thumb-friendly tab bar for riders on the move. */
export function RiderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Rider" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href || pathname.startsWith("/rider/jobs") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`mx-1 my-1 flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition-colors ${active ? "bg-white/10 text-brand-300" : "text-white/70 hover:bg-white/5"}`}
              >
                <Icon size={24} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
