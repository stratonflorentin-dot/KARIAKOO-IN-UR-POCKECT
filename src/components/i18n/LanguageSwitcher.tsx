"use client";

// SW · EN · FR switcher. Swaps the locale segment of the current URL, so the
// visitor stays on the same screen; the query string is kept at click time.
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { LOCALES, LOCALE_NAMES, localizePath, stripLocale, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type Tone = "light" | "dark";

export function LanguageSwitcher({ tone = "light", className = "" }: { tone?: Tone; className?: string }) {
  // Reading the URL suspends during prerendering; until then each pill links to that language's home.
  return (
    <Suspense fallback={<Pills tone={tone} className={className} hrefFor={(l) => `/${l}`} />}>
      <CurrentPageSwitcher tone={tone} className={className} />
    </Suspense>
  );
}

function CurrentPageSwitcher({ tone, className }: { tone: Tone; className: string }) {
  const router = useRouter();
  const base = stripLocale(usePathname());
  return (
    <Pills
      tone={tone}
      className={className}
      hrefFor={(l) => localizePath(l, base)}
      onPick={(href) => router.push(`${href}${window.location.search}`)}
    />
  );
}

function Pills({ tone, className, hrefFor, onPick }: { tone: Tone; className: string; hrefFor: (l: Locale) => string; onPick?: (href: string) => void }) {
  const { locale, t } = useI18n();
  const dark = tone === "dark";
  return (
    <nav aria-label={t.common.language} className={`inline-flex items-center rounded-full p-0.5 text-xs font-bold ${dark ? "bg-white/15 text-white backdrop-blur" : "bg-stone-100 text-ink"} ${className}`}>
      {LOCALES.map((l) => {
        const active = l === locale;
        const href = hrefFor(l);
        return (
          <NextLink
            key={l}
            href={href}
            hrefLang={l}
            lang={l}
            aria-current={active ? "true" : undefined}
            title={LOCALE_NAMES[l].name}
            onClick={(e) => {
              if (!onPick || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onPick(href);
            }}
            className={`grid h-7 min-w-9 place-items-center rounded-full px-2 transition ${
              active ? (dark ? "bg-white text-night" : "bg-brand-600 text-white") : dark ? "text-white/80 hover:text-white" : "text-muted hover:text-ink"
            }`}
          >
            {LOCALE_NAMES[l].short}
          </NextLink>
        );
      })}
    </nav>
  );
}
