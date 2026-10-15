"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({ value, min = 0, max, onChange, label }: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-12 items-center rounded-full border border-line bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="grid h-12 w-11 place-items-center rounded-l-full text-ink hover:bg-subtle disabled:text-stone-300"
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-8 text-center font-semibold tabular-nums">{value}</output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="grid h-12 w-11 place-items-center rounded-r-full text-ink hover:bg-subtle disabled:text-stone-300"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
