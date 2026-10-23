import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRole } from "@/lib/auth/session";

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
        const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", auth.user.id);
        const roles = ((roleRows ?? []) as { role: unknown }[]).map((row) => row.role).filter(isRole);
        const activeRole = roles.includes(role)
          ? role
          : roles.includes("customer") ? "customer"
          : roles.includes("seller") ? "seller"
          : roles.includes("rider") ? "rider"
          : undefined;
        if (activeRole) {
          cookieStore.set(ACTIVE_ROLE_COOKIE, activeRole, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        } else {
          cookieStore.delete(ACTIVE_ROLE_COOKIE);
        }
        if ((role === "seller" || role === "rider") && !roles.includes(role)) {
          destination = safeNext;
        } else if (!roles.includes(role) && activeRole) {
          destination = `/${activeRole}`;
        } else if (role !== "customer") {
          destination = safeNext.replace(new RegExp(`/apply/${role}/?$`), `/${role}`);
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
