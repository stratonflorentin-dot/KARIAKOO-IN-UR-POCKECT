import type { ReactNode } from "react";

/** Horizontally scrollable table container so wide tables never overflow the page on phones. */
export function TableCard({ children, label, minWidth = "44rem" }: { children: ReactNode; label: string; minWidth?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* `relative` keeps absolutely-positioned children (e.g. sr-only labels)
          inside the scroll box, so they can't widen the page on phones. */}
      <div className="relative overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
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

export const tdClass = "px-4 py-3 align-top";
export const tbodyClass = "divide-y divide-line";
