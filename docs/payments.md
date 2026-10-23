# KARIAKOO payments — architecture & setup

Provider-independent payment foundation. **No live provider is wired**, and
nothing marks a payment successful from a browser redirect. A payment becomes
`successful` only when a verified event is recorded in the ledger (admin
reconciliation today; a signature-verified provider webhook later).

## Pieces

| Layer | File | Role |
|-------|------|------|
| Status machine | `src/lib/payments/status.ts` | Pure TS transitions, mirrors the DB; unit-tested. |
| Adapter interface | `src/lib/payments/adapter.ts` | `PaymentAdapter` + a `disabledAdapter` registry for M-Pesa / Mixx / Airtel / HaloPesa. |
| Provider list | `src/lib/payments/providers.ts` | Derives checkout options from the registry; COD always on. |
| Ledger | `payment_transactions` table | Immutable, append-only, RLS-scoped, idempotent on `(provider, provider_ref)`. |
| Reconciliation | `record_payment_transaction()` RPC | Admin-only; records an event and advances `orders.payment_status` via a validated transition. |

## Payment status state machine

`pending → {successful, failed}`, `failed → {pending (retry), successful}`,
`successful → refunded`, `refunded → ∅`. Enforced in **both** `status.ts` and
the `record_payment_transaction` SQL — the database is the authority.

Events: `initiated`→pending, `succeeded`/`cod_collected`→successful,
`failed`→failed, `refunded`→refunded.

## Cash on delivery (available now)

COD orders are placed `pending`. When the rider collects, an admin records
`record_payment_transaction(order, 'cod', 'cod_collected', amount)`, which moves
the order to `successful` and writes an immutable ledger row + audit history.

## Enabling a mobile-money provider (later, needs credentials)

1. Implement a real `PaymentAdapter` (replace the matching `disabledAdapter` in
   `src/lib/payments/adapter.ts`): `initiate()` calls the provider's charge API;
   `verifyWebhook()` checks the HMAC signature and parses the result.
2. Set the server-only key(s) in `.env.local` (see `.env.example`:
   `MPESA_API_KEY`, `MIXX_API_KEY`, `AIRTEL_MONEY_API_KEY`, `HALOPESA_API_KEY`,
   `PAYMENT_WEBHOOK_SECRET`). Keys are **never** `NEXT_PUBLIC_`.
3. Add a webhook route that: verifies the signature, rejects replays (the ledger's
   `(provider, provider_ref)` unique constraint enforces idempotency), and records
   the event through a trusted path (service role / SECURITY DEFINER) — the same
   validated transition the admin RPC uses.
4. `isConfigured()` returns true only when real credentials **and** a working
   adapter are present, so the method appears at checkout only when it truly works.

## Security rules (non-negotiable)

- Never mark a payment successful from a client callback/redirect.
- Verify every webhook signature; treat unknown/failed signatures as no-ops.
- Idempotent processing: a provider transaction id is recorded at most once.
- Server/DB computes amounts; the browser never supplies the payable total.
- Secret keys stay server-side; the publishable Supabase key remains the only
  client key.

## Still required for go-live

Verified provider credentials + sandbox testing per operator, the webhook route,
and seller settlement / rider payout reconciliation reports built on this ledger.
