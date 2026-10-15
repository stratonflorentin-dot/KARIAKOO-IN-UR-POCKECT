"use client";

// Admin moderation controls (approve / reject / suspend / reactivate) with a
// mandatory reason, as every such action must be audit-logged. Demo preview:
// the change and its audit entry stay in this tab. In Phase 5 this becomes a
// Server Action that verifies the admin role from the database and writes the
// status change and an audit_logs row in one transaction.
import { useState } from "react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface ModerationOption {
  to: string;
  label: string;
  danger?: boolean;
}

export function ModerationActions({
  subject,
  initialStatus,
  statusTones,
  options,
}: {
  subject: string;
  initialStatus: string;
  statusTones: Record<string, Tone>;
  /** Allowed actions per current status. */
  options: Record<string, ModerationOption[]>;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState("");
  const [audit, setAudit] = useState("");
  const valid = reason.trim().length >= 5;

  return (
    <div className="flex flex-col items-start gap-2">
      <Badge tone={statusTones[status] ?? "neutral"} className="capitalize">{status}</Badge>
      <div className="flex flex-wrap gap-1.5">
        {(options[status] ?? []).map((opt) => (
          <ConfirmDialog
            key={opt.to}
            title={`${opt.label}: ${subject}?`}
            confirmLabel={opt.label}
            tone={opt.danger ? "danger" : "primary"}
            confirmDisabled={!valid}
            onConfirm={() => {
              setStatus(opt.to);
              setAudit(`Audit (demo, not saved): ${opt.label.toLowerCase()} by Founder · “${reason.trim()}”`);
              setReason("");
            }}
            body={
              <div>
                <label htmlFor={`reason-${subject}-${opt.to}`} className="block text-sm font-medium text-ink">Reason (required, recorded in the audit log)</label>
                <textarea
                  id={`reason-${subject}-${opt.to}`}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line p-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
                {!valid && <p className="mt-1 text-xs">At least 5 characters.</p>}
              </div>
            }
            trigger={(open) => (
              <Button size="sm" variant={opt.danger ? "outline" : "dark"} onClick={open} className={opt.danger ? "text-red-700" : ""}>
                {opt.label}<span className="sr-only"> {subject}</span>
              </Button>
            )}
          />
        ))}
      </div>
      {audit && <p role="status" className="max-w-xs text-xs text-muted">{audit}</p>}
    </div>
  );
}
