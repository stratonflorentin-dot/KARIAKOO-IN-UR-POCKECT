import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin lives on its own domain (e.g. admin.kariakoo.com) while the rest of
 * the app runs on the main domain. This middleware keeps the two cleanly
 * separated:
 *
 *  - On the admin domain, every request is rewritten under /admin so the
 *    admin role screens are always served there.
 *  - On the main domain, any /admin* path redirects to the admin domain.
 *
 * The admin domain is configured via the ADMIN_DOMAIN environment variable
 * (set it in your Vercel project settings, then add the domain under
 * Settings → Domains in the Vercel dashboard).
 */

function isAdminDomain(host: string | null, adminDomain: string | undefined): boolean {
  if (!adminDomain || !host) return false;
  const h = host.split(":")[0];
  return h === adminDomain || h.endsWith(`.${adminDomain}`);
}

export function middleware(request: NextRequest) {
  const adminDomain = process.env.ADMIN_DOMAIN;
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;
  const onAdmin = isAdminDomain(host, adminDomain);

  if (onAdmin) {
    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (adminDomain && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.host = adminDomain;
    url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maplibre|.*\\..*)*)"],
};
