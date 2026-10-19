"use client";

// Report-a-problem form for one order: pick a reason, add an optional note,
// submit. The server action checks you own the order; today it previews the
// flow without saving (no customer accounts yet).
import { CheckCircle2 } from "lucide-react";
import { useActionState, useId } from "react";
import { ISSUE_REASONS, reportIssue, type ReportState } from "@/app/customer/orders/[id]/actions";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

export function ReportIssueForm({ orderId }: { orderId: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<ReportState, FormData>(reportIssue, { status: "idle" });

  if (state.status === "ok") {
    return (
      <div className="rounded-3xl bg-emerald-50 p-5 text-emerald-900" role="status">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} aria-hidden="true" /> Report received
        </p>
        <p className="mt-1 text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="orderId" value={orderId} />

      <fieldset>
        <legend className="font-semibold">What went wrong?</legend>
        <ul className="mt-2 space-y-1">
          {ISSUE_REASONS.map((r, i) => (
            <li key={r.value}>
              <label className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-subtle">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  defaultChecked={i === 0}
                  className="h-5 w-5 accent-brand-600"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${id}-note`} className="text-sm font-medium text-ink">
          Add details <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-note`}
          name="note"
          rows={4}
          maxLength={500}
          placeholder="Tell us what happened so support can help faster."
          className={`${inputClass} py-3`}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? "Sending…" : "Submit report"}
      </Button>
    </form>
  );
}
