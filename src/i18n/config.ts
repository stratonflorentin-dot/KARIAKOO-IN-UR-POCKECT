// Locale settings shared by the proxy, server and client code.

export const LOCALES = ["en", "sw", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Remembers the visitor's last language, so unprefixed links and redirects keep it. */
export const LOCALE_COOKIE = "kk_locale";

export const LOCALE_NAMES: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  sw: { short: "SW", name: "Kiswahili" },
  fr: { short: "FR", name: "Français" },
};

/** BCP-47 tags for number and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-TZ", sw: "sw-TZ", fr: "fr-FR" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Paths served outside the localized app (route handlers, static assets). */
const UNLOCALIZED_PREFIXES = ["/auth/", "/_next/", "/brand/", "/maplibre/"];

/** "/customer" -> "/sw/customer". Leaves external, hash, already-localized and unlocalized paths alone. */
export function localizePath(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (UNLOCALIZED_PREFIXES.some((p) => path.startsWith(p))) return path;
  const first = path.split(/[/?#]/)[1];
  if (isLocale(first)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** "/sw/customer/orders" -> "/customer/orders". */
export function stripLocale(pathname: string): string {
  const first = pathname.split("/")[1];
  if (!isLocale(first)) return pathname;
  const rest = pathname.slice(first.length + 1);
  return rest === "" ? "/" : rest;
}

/** Replace {name} placeholders: fmt("Hi {name}", { name: "Asha" }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
