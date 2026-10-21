"use client";

// Drop-in replacement for next/link that keeps the visitor's language:
// href="/customer" renders as "/sw/customer" on a Swahili page.
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  const localizedHref =
    typeof href === "string"
      ? localizePath(locale, href)
      : href.pathname
        ? { ...href, pathname: localizePath(locale, href.pathname) }
        : href;
  return <NextLink href={localizedHref} {...props} />;
}
