"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";

// A plain GET form: works without JavaScript and keeps the query in the URL,
// so results are shareable and the back button works.
export function SearchBar({
  defaultValue = "",
  variant = "light",
  id = "site-search",
}: {
  defaultValue?: string;
  variant?: "light" | "glass";
  id?: string;
}) {
  const { t, path } = useI18n();
  const glass = variant === "glass";
  return (
    <form action={path("/customer/search")} role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        {t.search.label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border pl-4 pr-1.5 transition focus-within:ring-2 focus-within:ring-brand-500 ${
          glass ? "border-white/20 bg-white/10 text-white backdrop-blur-md" : "border-line bg-subtle text-ink"
        }`}
      >
        <Search size={20} className={glass ? "text-white/70" : "text-muted"} aria-hidden="true" />
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={t.search.placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className={`h-12 min-w-0 flex-1 bg-transparent text-base outline-none ${glass ? "placeholder:text-white/60" : "placeholder:text-stone-500"}`}
        />
        <button type="submit" className="h-9 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          {t.search.button}
        </button>
      </div>
    </form>
  );
}
