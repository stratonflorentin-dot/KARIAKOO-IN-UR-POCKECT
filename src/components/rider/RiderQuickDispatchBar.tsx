"use client";

import { useState } from "react";
import { MessageSquare, Check, Copy } from "lucide-react";

const RIDER_QUICK_MSGS = [
  { sw: "Nipo njiani kuleta mzigo wako", en: "On the way with your order" },
  { sw: "Nimefika getini / mlangoni kwako", en: "Arrived at your gate / entrance" },
  { sw: "Tafadhali kuwa tayari na PIN yako ya makabidhiano", en: "Please have your 4-digit delivery PIN ready" },
];

export function RiderQuickDispatchBar() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyText(text: string, index: number) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-subtle p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        <MessageSquare size={14} className="text-brand-600" aria-hidden="true" />
        <span>Rider quick dispatch updates</span>
      </div>
      <p className="mt-1 text-xs text-muted">Tap to copy and share quick status with the customer:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RIDER_QUICK_MSGS.map((msg, idx) => {
          const isCopied = copiedIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => copyText(`${msg.sw} (${msg.en})`, idx)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:border-brand-400 hover:bg-brand-50"
            >
              {isCopied ? (
                <>
                  <Check size={12} className="text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="text-muted" aria-hidden="true" />
                  <span>{msg.sw}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
