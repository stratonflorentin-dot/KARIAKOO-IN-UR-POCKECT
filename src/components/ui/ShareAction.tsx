"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, MessageCircle, MessageSquare, Share2, X } from "lucide-react";

interface ShareActionProps {
  title: string;
  text?: string;
  url?: string;
  label?: string;
  variant?: "pill" | "button" | "icon";
  className?: string;
}

const emptySubscribe = () => () => {};

export function ShareAction({
  title,
  text = "Tazama hii kwenye Kariakoo App!",
  url,
  label = "Share",
  variant = "pill",
  className = "",
}: ShareActionProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const supportsNativeShare = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false
  );

  function getShareUrl(): string {
    if (url) {
      if (url.startsWith("http")) return url;
      if (typeof window !== "undefined") return `${window.location.origin}${url}`;
    }
    return typeof window !== "undefined" ? window.location.href : "";
  }

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  function copyToClipboard() {
    const fullUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function shareToWhatsApp() {
    const fullUrl = getShareUrl();
    const message = encodeURIComponent(`${text}\n${title}\n${fullUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  }

  function shareToSMS() {
    const fullUrl = getShareUrl();
    const body = encodeURIComponent(`${text} ${fullUrl}`);
    window.location.href = `sms:?body=${body}`;
    setIsOpen(false);
  }

  async function triggerNativeShare() {
    const fullUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${text}\n${title}`,
          url: fullUrl,
        });
        setIsOpen(false);
      } catch {
        // User dismissed sheet
      }
    }
  }

  const baseClasses =
    variant === "button"
      ? "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
      : "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700 active:scale-95";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Share ${title}`}
          className={`grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-brand-400 hover:text-brand-700 active:scale-95 ${className}`}
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Share ${title}`}
          className={`${baseClasses} ${className}`}
        >
          {copied ? <Check size={15} className="text-emerald-600" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
          <span>{copied ? "Link Copied!" : label}</span>
        </button>
      )}

      {/* In-app Share Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">{label}</h3>
                  <p className="line-clamp-1 text-xs text-muted">{title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-stone-100 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={shareToWhatsApp}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-95"
              >
                <MessageCircle size={17} className="text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={shareToSMS}
                className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800 transition hover:bg-sky-100 active:scale-95"
              >
                <MessageSquare size={17} className="text-sky-600" />
                <span>SMS</span>
              </button>
            </div>

            {/* Copy Link Input Field */}
            <div className="mt-4">
              <label htmlFor="share-link-input" className="block text-xs font-medium text-muted mb-1.5">
                Copy Link
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-subtle p-1.5 focus-within:border-brand-500">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="w-full bg-transparent px-2.5 text-xs text-ink outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-black active:scale-95"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Optional native share button */}
            {supportsNativeShare && (
              <div className="mt-3 pt-3 border-t border-line text-center">
                <button
                  type="button"
                  onClick={triggerNativeShare}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition inline-flex items-center gap-1.5"
                >
                  <Share2 size={13} />
                  <span>More apps & options...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
