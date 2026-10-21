import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
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
  const parsedNext = new URL(next, origin);
  const safeNext = next.startsWith("/") && parsedNext.origin === origin
    ? `${parsedNext.pathname}${parsedNext.search}${parsedNext.hash}`
    : "/customer";
  const requestedRole = searchParams.get("as");
  const role = requestedRole === "seller" || requestedRole === "rider" ? requestedRole : "customer";

  if (code) {
    const sb = await createSupabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: auth } = await sb.auth.getUser();
      if (auth.user) {
        let destination = safeNext;
        const cookieStore = await cookies();
        if (role === "customer") {
          cookieStore.set(ACTIVE_ROLE_COOKIE, "customer", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        } else {
          const { data: roles } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", auth.user.id)
            .eq("role", role)
            .limit(1);
          if (roles?.length) {
            cookieStore.set(ACTIVE_ROLE_COOKIE, role, {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 30,
            });
            destination = safeNext.replace(new RegExp(`/apply/${role}/?$`), `/${role}`);
          }
        }
        return NextResponse.redirect(new URL(destination, origin));
      }
    }
  }
  const signIn = new URL("/sign-in", origin);
  signIn.searchParams.set("error", searchParams.get("provider") === "google" ? "google" : "link");
  if (role !== "customer") signIn.searchParams.set("as", role);
  return NextResponse.redirect(signIn);
}
