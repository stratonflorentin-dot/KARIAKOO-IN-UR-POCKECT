import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and forwards the
// updated cookies, so Server Components always read a fresh session. When
// Supabase is not configured (local dev without keys), it is a no-op.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Touch the user so an expiring token is refreshed and the new cookies ride
  // along on `response`. Do not gate anything on the result here — the per-page
  // RoleGate / requireRole checks are the real authorization.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static assets and the maplibre worker files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maplibre|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
