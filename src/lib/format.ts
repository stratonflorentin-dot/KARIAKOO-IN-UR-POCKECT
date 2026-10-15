const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Formats whole shillings as "TSh 345,000". */
export function formatTzs(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}TSh ${numberFormatter.format(Math.abs(Math.round(amount)))}`;
}

const TZ = "Africa/Dar_es_Salaam";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
}
