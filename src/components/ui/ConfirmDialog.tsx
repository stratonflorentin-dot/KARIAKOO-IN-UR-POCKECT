"use client";

// Accessible confirmation dialog built on the native <dialog> element, which
// handles focus trapping, Escape-to-close and the backdrop for us. Open/closed
// lives in React state; an effect syncs it to the element.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  tone = "danger",
  onConfirm,
  confirmDisabled = false,
}: {
  /** Render prop receiving `open` so any element can trigger the dialog. */
  trigger: (open: () => void) => ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  /** Keep the confirm button disabled, e.g. until a required reason is typed. */
  confirmDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  }, [isOpen]);

  return (
    <>
      {trigger(() => setIsOpen(true))}
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setIsOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false); // click on backdrop
        }}
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
          <div className="mt-2 text-sm text-muted">{body}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)} autoFocus>Cancel</Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              disabled={confirmDisabled}
              onClick={() => {
                onConfirm();
                setIsOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
