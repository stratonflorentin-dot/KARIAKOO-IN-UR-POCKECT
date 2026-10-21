import { cookies } from "next/headers";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath, type Locale } from "./config";
import { dictionaryFor, type Dictionary } from "./dictionaries";

/** The current page's locale, from the [lang] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Strings for the current page's locale (Server Components only). */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaryFor(await getLocale());
}

/** Prefix an app path with the current page's locale (Server Components only). */
export async function localized(path: string): Promise<string> {
  return localizePath(await getLocale(), path);
}

/**
 * Locale for Server Actions and Route Handlers, which can't read root params:
 * the proxy keeps this cookie in step with the language the visitor is using.
 */
export async function getRequestLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
