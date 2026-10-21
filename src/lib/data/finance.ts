import "server-only";

import type { Session } from "@/lib/auth/session";
import type { MobileMoneyProvider } from "@/lib/finance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PayoutAccount {
  provider: MobileMoneyProvider;
  msisdn: string; // 9 national digits
  holderName: string;
  tin: string | null;
  updatedAt: string;
}

/** The signed-in user's own payout account (RLS: owner only), or null if unset. */
export async function getPayoutAccount(session: Session): Promise<PayoutAccount | null> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("payout_accounts")
    .select("provider,msisdn,holder_name,tin,updated_at")
    .eq("user_id", session.userId)
    .limit(1);
  if (error) throw new Error(`Could not load payout account: ${error.message}`);
  const row = (data?.[0] ?? null) as
    | { provider: MobileMoneyProvider; msisdn: string; holder_name: string; tin: string | null; updated_at: string }
    | null;
  if (!row) return null;
  return { provider: row.provider, msisdn: row.msisdn, holderName: row.holder_name, tin: row.tin, updatedAt: row.updated_at };
}
