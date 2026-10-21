"use server";

import { revalidatePath } from "next/cache";
import { getRequestLocale } from "@/i18n/server";
import { dictionaryFor } from "@/i18n/dictionaries";
import { getSession } from "@/lib/auth/session";
import { MOBILE_MONEY, normalizeTin, normalizeTzMsisdn, type MobileMoneyProvider } from "@/lib/finance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PayoutFormState {
  status: "idle" | "ok" | "error";
  message?: string;
}

const PROVIDER_IDS = MOBILE_MONEY.map((m) => m.id);

/** Save the signed-in seller's / rider's mobile-money payout account. */
export async function savePayoutAccount(_prev: PayoutFormState, formData: FormData): Promise<PayoutFormState> {
  const e = dictionaryFor(await getRequestLocale()).finance.errors;
  const session = await getSession();
  if (!session) return { status: "error", message: e.signIn };

  const holderName = String(formData.get("holder_name") ?? "").trim();
  const provider = String(formData.get("provider") ?? "") as MobileMoneyProvider;
  const msisdn = normalizeTzMsisdn(String(formData.get("msisdn") ?? ""));
  const tinRaw = String(formData.get("tin") ?? "").trim();
  const tin = tinRaw ? normalizeTin(tinRaw) : null;

  if (holderName.length < 2) return { status: "error", message: e.holderName };
  if (!PROVIDER_IDS.includes(provider)) return { status: "error", message: e.provider };
  if (!msisdn) return { status: "error", message: e.msisdn };
  if (tinRaw && !tin) return { status: "error", message: e.tin };

  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("payout_accounts")
    .upsert({ user_id: session.userId, provider, msisdn, holder_name: holderName, tin }, { onConflict: "user_id" });
  if (error) return { status: "error", message: e.generic };

  revalidatePath("/[lang]/seller/finances", "page");
  revalidatePath("/[lang]/rider/earnings", "page");
  return { status: "ok", message: e.saved };
}
