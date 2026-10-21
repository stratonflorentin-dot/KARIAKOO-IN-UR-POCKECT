"use client";

// Moderation controls for seller/rider applications. Each action runs the
// moderateApplication server action, which calls the admin_set_* RPCs and
// re-renders the page with the new status. The RPC audit-logs the actor and
// the new status in the database.
import { useActionState } from "react";
import { moderateApplication, type ModerationResult } from "@/app/[lang]/admin/actions";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface ModerationOption {
  to: string;
  label: string;
  danger?: boolean;
}

const initial: ModerationResult = { status: "idle" };

export function LiveModerationActions({
  kind,
  id,
  subject,
  status,
  statusTones,
  options,
}: {
  kind: "shop" | "rider";
  id: string;
  subject: string;
  status: string;
  statusTones: Record<string, Tone>;
  options: Record<string, ModerationOption[]>;
}) {
  const [state, dispatch, pending] = useActionState<ModerationResult, FormData>(moderateApplication, initial);

  function act(to: string) {
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("id", id);
    fd.set("status", to);
    dispatch(fd);
  }

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
            onConfirm={() => act(opt.to)}
            body={
              <p>
                This updates <strong className="text-ink">{subject}</strong> to <strong className="text-ink">{opt.to}</strong>. The
                change and your name are recorded in the audit log.
              </p>
            }
            trigger={(open) => (
              <Button size="sm" variant={opt.danger ? "outline" : "dark"} onClick={open} disabled={pending} className={opt.danger ? "text-red-700" : ""}>
                {opt.label}<span className="sr-only"> {subject}</span>
              </Button>
            )}
          />
        ))}
      </div>
      {pending && <p role="status" className="text-xs text-muted">Saving…</p>}
      {state.status === "error" && <p role="alert" className="max-w-xs text-xs text-red-700">{state.message}</p>}
    </div>
  );
}
