"use client";

import { useState } from "react";
import { MessageSquare, Check, Copy } from "lucide-react";

const QUICK_MSGS_SW_EN = [
  { sw: "Nipo getini nasubiri", en: "I am waiting at the gate" },
  { sw: "Tafadhali nipigie ukifika", en: "Please call when you arrive" },
  { sw: "Pesa taslimu ipo tayari", en: "Cash is ready for pickup" },
  { sw: "Nipo ghorofani, nitashuka", en: "I am upstairs, coming down" },
];

export function QuickCoordinationPills({ title = "Quick updates for rider" }: { title?: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyText(text: string, index: number) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-subtle p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <MessageSquare size={14} className="text-brand-600" aria-hidden="true" />
        <span>{title}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {QUICK_MSGS_SW_EN.map((msg, idx) => {
          const isCopied = copiedIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => copyText(`${msg.sw} (${msg.en})`, idx)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:border-brand-400 hover:bg-brand-50"
              title="Click to copy quick message"
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
                  <span className="text-muted">· {msg.en}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
