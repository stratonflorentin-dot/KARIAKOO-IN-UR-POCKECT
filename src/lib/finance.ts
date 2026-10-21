// Tanzania-specific finance helpers for KARIAKOO: VAT, mobile-money payout
// accounts, and TIN handling. Pure functions — no I/O, safe on client or server.
//
// References: TRA standard VAT rate is 18% and consumer prices in Tanzania are
// quoted VAT-inclusive, so we back out the VAT from a gross TZS price. Payouts
// to sellers and riders are made to mobile-money wallets (the dominant way
// money moves in TZ), identified by the phone number's network prefix.

export const VAT_RATE_BPS = 1800; // 18%, TRA standard rate.

export interface VatBreakdown {
  grossTzs: number; // VAT-inclusive amount shown to customers
  netTzs: number; // amount excluding VAT
  vatTzs: number; // VAT portion
}

/** Split a VAT-inclusive TZS amount into net + 18% VAT. */
export function vatBreakdown(grossTzs: number): VatBreakdown {
  const net = Math.round((grossTzs * 10000) / (10000 + VAT_RATE_BPS));
  return { grossTzs, netTzs: net, vatTzs: grossTzs - net };
}

export type MobileMoneyProvider = "mpesa" | "mixx" | "airtelmoney" | "halopesa" | "tpesa";

export interface MobileMoneyNetwork {
  id: MobileMoneyProvider;
  name: string;
  carrier: string;
  /** Leading digits after the national "0", e.g. "074" → prefix "74". */
  prefixes: string[];
}

// Network prefixes per TCRA numbering. Used to detect the wallet from a number.
export const MOBILE_MONEY: MobileMoneyNetwork[] = [
  { id: "mpesa", name: "M-Pesa", carrier: "Vodacom", prefixes: ["74", "75", "76"] },
  { id: "mixx", name: "Mixx by Yas", carrier: "Yas (Tigo)", prefixes: ["71", "65", "67"] },
  { id: "airtelmoney", name: "Airtel Money", carrier: "Airtel", prefixes: ["78", "68", "69"] },
  { id: "halopesa", name: "HaloPesa", carrier: "Halotel", prefixes: ["62", "61"] },
  { id: "tpesa", name: "T-Pesa", carrier: "TTCL", prefixes: ["73"] },
];

/** Digits only, dropping a +255 / 255 / leading 0 country prefix. Returns the 9 national digits (e.g. "742123456"). */
export function normalizeTzMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("255")) national = national.slice(3);
  else if (national.startsWith("0")) national = national.slice(1);
  // National mobile numbers are 9 digits and start with 6 or 7.
  return /^[67]\d{8}$/.test(national) ? national : null;
}

export function isValidTzMobile(input: string): boolean {
  return normalizeTzMsisdn(input) !== null;
}

/** "0742 123 456" formatting for display. */
export function formatTzMsisdn(input: string): string {
  const n = normalizeTzMsisdn(input);
  if (!n) return input;
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/** Guess the mobile-money network from a Tanzanian number, or null if unknown. */
export function detectProvider(input: string): MobileMoneyNetwork | null {
  const n = normalizeTzMsisdn(input);
  if (!n) return null;
  const prefix = n.slice(0, 2);
  return MOBILE_MONEY.find((m) => m.prefixes.includes(prefix)) ?? null;
}

export function providerById(id: string): MobileMoneyNetwork | undefined {
  return MOBILE_MONEY.find((m) => m.id === id);
}

/** Tanzania TIN: 9 digits, conventionally shown as XXX-XXX-XXX. */
export function normalizeTin(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

export function formatTin(input: string): string {
  const n = normalizeTin(input);
  if (!n) return input;
  return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
}
