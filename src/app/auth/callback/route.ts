import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for links Supabase emails (password reset, email confirm).
 * Exchanges the one-time code for a session, then continues to `next`, which
 * must be a same-site path so this can't be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/customer";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/customer";

  if (code) {
    const sb = await createSupabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", origin));
}
