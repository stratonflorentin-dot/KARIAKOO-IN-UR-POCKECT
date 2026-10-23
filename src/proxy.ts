import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * Runs on every page request, in this order:
 *
 * 1. Languages. App pages live under /en, /sw or /fr. A path without a locale
 *    (typed URL, old link, server redirect) is sent to the visitor's language:
 *    their saved choice, else their browser's, else English. The locale being
 *    viewed is kept in a cookie so server actions and redirects can follow it.
 *
 * 2. Admin domain (ADMIN_DOMAIN, defaulting to the production admin hostname).
 *    On the admin domain, app paths
 *    are served from /admin (sign-in and password pages excepted); on the main
 *    domain, /admin paths redirect to the admin domain.
 *
 * 3. Supabase session refresh, so Server Components always read a fresh
 *    session. Nothing is gated here — RoleGate / requireRole do authorization.
 */

const ONE_YEAR = 60 * 60 * 24 * 365;
const DEFAULT_ADMIN_DOMAIN = "kariakoo-admin-nine.vercel.app";

/** Paths an admin-domain visitor reaches as-is rather than under /admin. */
const ADMIN_DOMAIN_PASSTHROUGH = ["/", "/admin", "/staff", "/sign-in", "/forgot-password", "/reset-password"];

function isAdminDomain(host: string | null, adminDomain: string | undefined): boolean {
  if (!adminDomain || !host) return false;
  const h = host.split(":")[0];
  return h === adminDomain || h.endsWith(`.${adminDomain}`);
}

/** First supported language in the Accept-Language header, by preference. */
function browserLocale(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((x) => x.lang && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  return ranked.map((x) => x.lang).find(isLocale) ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  const adminDomain = process.env.ADMIN_DOMAIN?.trim() || DEFAULT_ADMIN_DOMAIN;
  // Route handlers outside the localized app (e.g. /auth/callback) keep their path.
  const localized = !pathname.startsWith("/auth/");

  // The admin site's bare URL is its dedicated staff login. Do this before
  // locale negotiation, which would otherwise send `/` to the public home page.
  if (localized && pathname === "/" && isAdminDomain(request.headers.get("host"), adminDomain)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : browserLocale(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/staff`;
    return NextResponse.redirect(url);
  }

  // 1. Send unprefixed paths to the visitor's language.
  if (localized && !isLocale(first)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : browserLocale(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
    const url = request.nextUrl.clone();
    // Supabase can send provider-exchange failures to its configured Site URL
    // instead of the app callback. Route that error to the existing friendly
    // Google sign-in notice, and discard the provider's raw error/code values.
    if (pathname === "/" && request.nextUrl.searchParams.get("error_code") === "unexpected_failure") {
      url.pathname = `/${locale}/sign-in`;
      url.search = "";
      url.searchParams.set("error", "google");
      return NextResponse.redirect(url);
    }
    url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Admin domain routing.
  let rewriteTo: URL | null = null;
  if (localized && isLocale(first)) {
    const rest = pathname.slice(first.length + 1) || "/";
    if (isAdminDomain(request.headers.get("host"), adminDomain)) {
      if (rest === "/") {
        rewriteTo = request.nextUrl.clone();
        rewriteTo.pathname = `/${first}/staff`;
      }
      if (!ADMIN_DOMAIN_PASSTHROUGH.some((p) => rest === p || rest.startsWith(`${p}/`))) {
        rewriteTo = request.nextUrl.clone();
        rewriteTo.pathname = `/${first}/admin${rest === "/" ? "" : rest}`;
      }
    } else if (adminDomain && (rest === "/admin" || rest.startsWith("/admin/"))) {
      const url = request.nextUrl.clone();
      url.host = adminDomain;
      url.protocol = "https:";
      url.port = "";
      return NextResponse.redirect(url);
    }
  }

  const pass = () => (rewriteTo ? NextResponse.rewrite(rewriteTo, { request }) : NextResponse.next({ request }));
  let response = pass();

  // 3. Refresh the Supabase session (no-op when Supabase isn't configured).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = pass();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Touch the user so an expiring token is refreshed and the new cookies ride along.
    await supabase.auth.getUser();
  }

  if (localized && isLocale(first) && request.cookies.get(LOCALE_COOKIE)?.value !== first) {
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
  return response;
}

export const config = {
  // Skip Next internals, static folders and any path with a file extension.
  matcher: ["/((?!_next|favicon.ico|maplibre|brand|.*\\..*).*)"],
};
