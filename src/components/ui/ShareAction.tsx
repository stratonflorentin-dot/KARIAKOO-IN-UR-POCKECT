"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

interface ShareActionProps {
  title: string;
  text?: string;
  url?: string;
  label?: string;
  variant?: "pill" | "button" | "icon";
  className?: string;
}

export function ShareAction({
  title,
  text = "Tazama hii kwenye Kariakoo App!",
  url,
  label = "Share",
  variant = "pill",
  className = "",
}: ShareActionProps) {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  function getShareUrl(): string {
    if (url) {
      if (url.startsWith("http")) return url;
      if (typeof window !== "undefined") return `${window.location.origin}${url}`;
    }
    return typeof window !== "undefined" ? window.location.href : "";
  }

  async function handleShare() {
    const fullUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${text}\n${title}`,
          url: fullUrl,
        });
        return;
      } catch {
        // User dismissed share sheet or cancelled
      }
    }
    // Fallback: toggle dropdown with WhatsApp and Copy Link options
    setShowDropdown((prev) => !prev);
  }

  function copyToClipboard() {
    const fullUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowDropdown(false);
      }, 2000);
    }
  }

  function shareToWhatsApp() {
    const fullUrl = getShareUrl();
    const message = encodeURIComponent(`${text}\n${title}\n${fullUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank", "noopener,noreferrer");
    setShowDropdown(false);
  }

  if (variant === "icon") {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={handleShare}
          aria-label={`Share ${title}`}
          className={`grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-brand-400 hover:text-brand-700 ${className}`}
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
        </button>
        {showDropdown && renderDropdown()}
      </div>
    );
  }

  const baseClasses =
    variant === "button"
      ? "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      : "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleShare}
        aria-label={`Share ${title}`}
        className={`${baseClasses} ${className}`}
      >
        {copied ? <Check size={15} className="text-emerald-600" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        <span>{copied ? "Link Copied!" : label}</span>
      </button>

      {showDropdown && renderDropdown()}
    </div>
  );

  function renderDropdown() {
    return (
      <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl border border-line bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={shareToWhatsApp}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          <MessageCircle size={15} className="text-emerald-600" />
          <span>Share to WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink transition hover:bg-subtle"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} className="text-muted" />}
          <span>{copied ? "Copied to clipboard!" : "Copy link"}</span>
        </button>
      </div>
    );
  }
}
