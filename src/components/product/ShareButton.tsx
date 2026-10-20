"use client";

// Share the current product. Uses the native share sheet where available
// (mobile), and falls back to copying the link with brief inline feedback.
import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // User dismissed the share sheet, or clipboard was blocked — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this product"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
