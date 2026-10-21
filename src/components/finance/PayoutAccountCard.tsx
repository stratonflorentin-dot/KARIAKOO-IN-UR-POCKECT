"use client";

import { BadgeCheck, Pencil, Wallet } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { savePayoutAccount, type PayoutFormState } from "@/app/[lang]/finance-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { detectProvider, formatTin, formatTzMsisdn, MOBILE_MONEY, providerById } from "@/lib/finance";
import type { PayoutAccount } from "@/lib/data/finance";

const inputClass =
  "mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-ink shadow-sm outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

export function PayoutAccountCard({ account, updatedLabel }: { account: PayoutAccount | null; updatedLabel: string }) {
  const { t } = useI18n();
  const f = t.finance;
  const [editing, setEditing] = useState(account === null);

  return (
    <Card aria-labelledby="payout-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Wallet size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="payout-heading" className="font-semibold">{f.payoutTitle}</h2>
            <p className="text-sm text-muted">{f.payoutSubtitle}</p>
          </div>
        </div>
        {account && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-brand-300">
            <Pencil size={14} aria-hidden="true" /> {f.edit}
          </button>
        )}
      </div>

      {account && !editing ? (
        <div className="mt-4 rounded-2xl bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{f.currentAccount}</p>
          <p className="mt-1 flex items-center gap-2 font-semibold">
            <BadgeCheck size={16} className="text-brand-600" aria-hidden="true" />
            {providerById(account.provider)?.name ?? account.provider} · {formatTzMsisdn(account.msisdn)}
          </p>
          <p className="text-sm text-muted">{account.holderName}{account.tin ? ` · TIN ${formatTin(account.tin)}` : ""}</p>
          <p className="mt-1 text-xs text-muted">{updatedLabel}</p>
        </div>
      ) : (
        <PayoutForm account={account} onSaved={() => setEditing(false)} />
      )}

      <p className="mt-3 text-xs text-muted">{f.howPaid}</p>
    </Card>
  );
}

function PayoutForm({ account, onSaved }: { account: PayoutAccount | null; onSaved: () => void }) {
  const { t } = useI18n();
  const f = t.finance;
  const id = useId();
  const [state, action, pending] = useActionState<PayoutFormState, FormData>(
    async (prev, fd) => {
      const result = await savePayoutAccount(prev, fd);
      if (result.status === "ok") onSaved();
      return result;
    },
    { status: "idle" },
  );
  // Live-detect the network as the number is typed; the user can still override.
  const [provider, setProvider] = useState(account?.provider ?? "");
  const [autoDetected, setAutoDetected] = useState(false);

  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">{f.holderNameLabel}</label>
        <input id={`${id}-name`} name="holder_name" defaultValue={account?.holderName} autoComplete="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-msisdn`} className="text-sm font-medium text-ink">{f.msisdnLabel}</label>
        <input
          id={`${id}-msisdn`}
          name="msisdn"
          type="tel"
          inputMode="tel"
          defaultValue={account ? formatTzMsisdn(account.msisdn) : ""}
          placeholder="0742 123 456"
          required
          className={inputClass}
          onChange={(e) => {
            const net = detectProvider(e.target.value);
            if (net) {
              setProvider(net.id);
              setAutoDetected(true);
            } else {
              setAutoDetected(false);
            }
          }}
        />
        <p className="mt-1 text-xs text-muted">{f.msisdnHint}</p>
      </div>
      <div>
        <label htmlFor={`${id}-provider`} className="text-sm font-medium text-ink">{f.providerLabel}</label>
        <select id={`${id}-provider`} name="provider" value={provider} onChange={(e) => { setProvider(e.target.value); setAutoDetected(false); }} required className={inputClass}>
          <option value="" disabled>—</option>
          {MOBILE_MONEY.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.carrier})</option>)}
        </select>
        {autoDetected && <p className="mt-1 text-xs text-brand-700">{f.providerAuto}</p>}
      </div>
      <div>
        <label htmlFor={`${id}-tin`} className="text-sm font-medium text-ink">{f.tinLabel}</label>
        <input id={`${id}-tin`} name="tin" inputMode="numeric" defaultValue={account?.tin ? formatTin(account.tin) : ""} placeholder="123-456-789" className={inputClass} />
        <p className="mt-1 text-xs text-muted">{f.tinHint}</p>
      </div>
      {state.status === "error" && <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p>}
      {state.status === "ok" && <Notice tone="success">{fmt("{msg}", { msg: state.message ?? "" })}</Notice>}
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? f.saving : f.save}
      </Button>
    </form>
  );
}
