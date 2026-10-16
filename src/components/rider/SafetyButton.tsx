"use client";

// One-tap safety and help for riders: emergency numbers, KARIAKOO support,
// and problem reports. Demo preview: reports are kept on this phone until
// incident reporting to dispatch arrives (Phase 6).
import { Phone, ShieldAlert, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";

// Tanzania emergency numbers. Verify before launch (see README checklist).
const EMERGENCY = [
  { label: "Police", number: "112" },
  { label: "Ambulance", number: "115" },
  { label: "Fire", number: "114" },
];

const REASONS = ["Accident or injury", "I feel unsafe", "Motorcycle breakdown", "Goods damaged or missing", "Customer problem"];

export function SafetyButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setSaved(""); setOpen(true); }}
        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-red-600 px-3 text-sm font-bold text-white"
      >
        <ShieldAlert size={18} aria-hidden="true" /> SOS
        <span className="sr-only"> safety and help</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/60"
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-bold">Safety &amp; help</h2>
            <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-subtle">
              <X aria-hidden="true" /><span className="sr-only">Close</span>
            </button>
          </div>

          <p className="mt-1 text-sm text-muted">In danger? Call emergency services first.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {EMERGENCY.map((e) => (
              <a key={e.number} href={`tel:${e.number}`} className="flex flex-col items-center rounded-2xl bg-red-600 py-3 text-white">
                <Phone size={18} aria-hidden="true" />
                <span className="mt-1 text-lg font-bold">{e.number}</span>
                <span className="text-xs">{e.label}</span>
              </a>
            ))}
          </div>

          {SUPPORT_PHONE ? (
            <a href={`tel:${SUPPORT_PHONE}`} className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-night font-semibold text-white">
              <Phone size={16} aria-hidden="true" /> Call KARIAKOO support
            </a>
          ) : (
            <p className="mt-3 rounded-2xl bg-subtle p-3 text-sm text-muted">KARIAKOO support line: not set up yet. It appears here once a number is configured.</p>
          )}

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason) return;
              setSaved(`Report saved on this phone: “${reason}”. Sending reports to dispatch arrives in Phase 6.`);
              setReason("");
              setDetails("");
            }}
          >
            <fieldset>
              <legend className="font-semibold">Report a problem</legend>
              <div className="mt-2 space-y-1">
                {REASONS.map((r) => (
                  <label key={r} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-subtle">
                    <input type="radio" name="sos-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-brand-600" />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              Details (optional)
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-xl border border-line p-3 text-sm" />
            </label>
            <Button type="submit" full disabled={!reason}>Send report</Button>
            <p role="status" aria-live="polite" className="text-sm text-emerald-800">{saved}</p>
          </form>
        </div>
      </dialog>
    </>
  );
}
