import type { ReactNode } from "react";

/** Horizontally scrollable table container so wide tables never overflow the page on phones.
 *  On small screens a right-edge fade and a "swipe →" hint make it obvious that the table
 *  scrolls sideways, so columns pushed off-screen (and their controls) stay reachable. */
export function TableCard({ children, label, minWidth = "44rem" }: { children: ReactNode; label: string; minWidth?: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm shadow-stone-950/[0.025]">
      {/* `relative` keeps absolutely-positioned children (e.g. sr-only labels)
          inside the scroll box, so they can't widen the page on phones.
          `overscroll-x-contain` stops a sideways swipe from also scrolling the page. */}
      <div className="relative overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]" role="region" aria-label={label} tabIndex={0}>
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
      {/* Mobile scroll affordance — hidden on lg+ where the table fits. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent lg:hidden" />
      <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-2 rounded-full bg-white/80 px-1.5 text-[10px] font-semibold text-stone-500 lg:hidden">swipe →</span>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.12em] text-stone-600">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" }) {
  return (
    <th scope="col" className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

export const tdClass = "px-4 py-3.5 align-top";
export const tbodyClass = "divide-y divide-line";
