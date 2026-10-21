import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import fr from "./fr";
import sw from "./sw";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, sw, fr };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
