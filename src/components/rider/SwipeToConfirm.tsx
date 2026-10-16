"use client";

// Swipe-to-confirm, so delivery steps can't be triggered by an accidental tap
// while riding. Drag the handle at least 85% of the way to confirm.
// Keyboard and screen-reader users confirm with Enter or Space on the handle.
import { ChevronsRight } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";

const THRESHOLD = 0.85;
const noopSubscribe = () => () => {};

export function SwipeToConfirm({ label, onConfirm, disabled = false, tone = "brand" }: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: "brand" | "dark" | "success";
}) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; max: number } | null>(null);
  const [offset, setOffset] = useState(0);
  // Live position for the release check: state can lag a render behind a
  // fast swipe, which would wrongly reject a full drag.
  const live = useRef(0);
  const [dragging, setDragging] = useState(false);

  // Until the page's JavaScript is ready the handle can't be dragged, so keep
  // it disabled rather than letting a swipe silently do nothing.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const off = disabled || !hydrated;
  const bg = { brand: "bg-brand-600", dark: "bg-night", success: "bg-emerald-700" }[tone];

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (off || !track.current) return;
    const handle = e.currentTarget.getBoundingClientRect().width;
    live.current = 0;
    start.current = { x: e.clientX, max: track.current.getBoundingClientRect().width - handle - 8 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    live.current = Math.min(Math.max(0, e.clientX - start.current.x), start.current.max);
    setOffset(live.current);
  }

  function onPointerUp() {
    if (!start.current) return;
    const done = live.current >= start.current.max * THRESHOLD;
    live.current = 0;
    start.current = null;
    setDragging(false);
    setOffset(0);
    if (done) onConfirm();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (off) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onConfirm();
    }
  }

  return (
    <div
      ref={track}
      className={`relative h-16 w-full select-none overflow-hidden rounded-full ${disabled ? "bg-stone-300" : bg}`}
      style={{ touchAction: "pan-y" }}
    >
      <span className={`pointer-events-none absolute inset-0 grid place-items-center pl-14 text-base font-semibold ${disabled ? "text-stone-600" : "text-white"}`}>
        {label}
      </span>
      <button
        type="button"
        disabled={off}
        aria-label={`${label}: swipe right, or press Enter`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`absolute left-1 top-1 grid h-14 w-14 cursor-grab touch-none place-items-center rounded-full bg-white text-ink shadow-md active:cursor-grabbing disabled:cursor-not-allowed ${dragging ? "" : "transition-transform"}`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <ChevronsRight aria-hidden="true" />
      </button>
    </div>
  );
}
