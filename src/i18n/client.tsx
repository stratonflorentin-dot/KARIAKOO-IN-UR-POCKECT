"use client";

import { createContext, useContext, type ReactNode } from "react";
import { localizePath, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(null);

/**
 * Provided once by the root layout with the active language's strings only,
 * so the other languages never reach the browser.
 */
export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>;
}

/** Strings, the active locale and a path localizer for Client Components. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider> (the [lang] root layout).");
  return { locale: ctx.locale, t: ctx.t, path: (p: string) => localizePath(ctx.locale, p) };
}
