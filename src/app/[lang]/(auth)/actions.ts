"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { localizePath, type Locale } from "@/i18n/config";
import { dictionaryFor, type Dictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/server";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
import { isRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface AuthState {
  status: "idle" | "error" | "ok";
  message?: string;
}

/** Turn Supabase's raw auth errors into plain, honest guidance in the visitor's language. */
function friendlyAuthError(message: string, e: Dictionary["auth"]["errors"]): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return e.invalidCredentials;
  if (m.includes("already registered") || m.includes("already been registered")) return e.alreadyRegistered;
  if (m.includes("email not confirmed")) return e.emailNotConfirmed;
  if (m.includes("email") && m.includes("invalid")) return e.invalidEmail;
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return e.signupsDisabled;
  if (m.includes("password")) return message; // Supabase's length/strength messages are already specific
  if (m.includes("rate limit")) return e.rateLimited;
  return e.generic;
}

/** The visitor's locale and its auth error strings. */
async function context(): Promise<{ locale: Locale; e: Dictionary["auth"]["errors"] }> {
  const locale = await getRequestLocale();
  return { locale, e: dictionaryFor(locale).auth.errors };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { locale, e } = await context();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: e.enterEmailPassword };

  const requested = String(formData.get("as") ?? "customer");
  const as = requested === "seller" || requested === "rider" ? requested : "customer";

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: friendlyAuthError(error?.message ?? "", e) };

  const { data: roleRows, error: rolesError } = await sb.from("user_roles").select("role").eq("user_id", data.user.id);
  if (rolesError) {
    await sb.auth.signOut();
    return { status: "error", message: e.generic };
  }
  const roles = ((roleRows ?? []) as { role: unknown }[]).map((row) => row.role).filter(isRole);
  const activeRole: Role | undefined = roles.includes(as)
    ? as
    : roles.includes("customer") ? "customer"
    : roles.includes("seller") ? "seller"
    : roles.includes("rider") ? "rider"
    : undefined;
  const cookieStore = await cookies();
  if (activeRole) cookieStore.set(ACTIVE_ROLE_COOKIE, activeRole, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  else cookieStore.delete(ACTIVE_ROLE_COOKIE);

  // Seller / rider logins land in that area when the account holds the role;
  // otherwise on the application page, which shows their status or the form.
  if (as === "seller" || as === "rider") {
    if (roles.includes(as)) redirect(localizePath(locale, `/${as}`));
    redirect(localizePath(locale, `/apply/${as}`));
  }
  if (roles.includes("customer")) redirect(localizePath(locale, "/customer"));
  if (activeRole) redirect(localizePath(locale, `/${activeRole}`));
  redirect(localizePath(locale, "/welcome"));
}

/** Start the Supabase-hosted Google OAuth flow for the selected app role. */
export async function beginGoogleSignIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { locale, e } = await context();
  const requestedRole = String(formData.get("as") ?? "customer");
  const as = requestedRole === "seller" || requestedRole === "rider" ? requestedRole : "customer";
  const nextPath = as === "customer" ? "/customer" : `/apply/${as}`;
  const callback = new URL("/auth/callback", await requestOrigin());
  callback.searchParams.set("provider", "google");
  callback.searchParams.set("as", as);
  callback.searchParams.set("next", localizePath(locale, nextPath));

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    return {
      status: "error",
      message: error
        ? friendlyAuthError(error.message, e)
        : dictionaryFor(locale).auth.googleFailed,
    };
  }
  redirect(data.url);
}

/** Absolute origin of this request, for links Supabase emails back to us. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Email a password-reset link. The reply is the same whether or not the email
 * has an account, so this can't be used to discover who is registered.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { locale, e } = await context();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error", message: e.enterResetEmail };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(localizePath(locale, "/reset-password"))}`,
  });
  if (error && error.message.toLowerCase().includes("rate limit")) {
    return { status: "error", message: e.rateLimited };
  }
  return { status: "ok", message: e.resetSent };
}

/** Set a new password for the user signed in through the reset link. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { locale, e } = await context();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { status: "error", message: e.passwordShort };

  const sb = await createSupabaseServerClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { status: "error", message: e.resetExpired };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { status: "error", message: friendlyAuthError(error.message, e) };
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", auth.user.id);
  const available = ((roles ?? []) as { role: unknown }[]).map((row) => row.role).filter(isRole);
  const activeRole = available.includes("customer") ? "customer" : available.includes("seller") ? "seller" : available.includes("rider") ? "rider" : undefined;
  const cookieStore = await cookies();
  if (activeRole) {
    cookieStore.set(ACTIVE_ROLE_COOKIE, activeRole, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    redirect(localizePath(locale, `/${activeRole}`));
  }
  cookieStore.delete(ACTIVE_ROLE_COOKIE);
  redirect(localizePath(locale, "/sign-in"));
}

/**
 * Staff / admin sign-in, kept separate from the public customer entrance.
 * Admins are never minted from a form: user_roles has no client write policy,
 * so this just authenticates and then checks the signed-in user actually holds
 * the `admin` role. A non-admin who signs in here is signed back out — the
 * staff door never drops a normal user into the dashboard area.
 */
export async function signInStaff(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { locale, e } = await context();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: e.enterStaffEmailPassword };

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: friendlyAuthError(error?.message ?? "", e) };

  const { data: roleRows } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .limit(1);

  if (!roleRows || roleRows.length === 0) {
    // Authenticated, but not staff: don't leave them holding a session here.
    await sb.auth.signOut();
    return { status: "error", message: e.staffOnly };
  }

  (await cookies()).set(ACTIVE_ROLE_COOKIE, "admin", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(localizePath(locale, "/admin"));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { locale, e } = await context();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("as") ?? "customer");
  const as = requestedRole === "seller" || requestedRole === "rider" ? requestedRole : "customer";
  if (fullName.length < 2) return { status: "error", message: e.enterName };
  if (!email) return { status: "error", message: e.enterEmail };
  if (password.length < 8) return { status: "error", message: e.passwordShort };

  const callback = new URL("/auth/callback", await requestOrigin());
  callback.searchParams.set("provider", "email");
  callback.searchParams.set("as", as);
  callback.searchParams.set(
    "next",
    localizePath(locale, as === "customer" ? "/customer" : `/apply/${as}`),
  );
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callback.toString(),
    },
  });
  if (error) return { status: "error", message: friendlyAuthError(error.message, e) };
  // When email confirmation is on, there is no session yet.
  if (!data.session) return { status: "ok", message: e.accountCreated };
  if (!data.user) return { status: "error", message: e.generic };
  const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", data.user.id);
  const roles = ((roleRows ?? []) as { role: unknown }[]).map((row) => row.role).filter(isRole);
  const activeRole = roles.includes("customer") ? "customer" : roles.includes("seller") ? "seller" : roles.includes("rider") ? "rider" : undefined;
  const cookieStore = await cookies();
  if (activeRole) cookieStore.set(ACTIVE_ROLE_COOKIE, activeRole, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  else cookieStore.delete(ACTIVE_ROLE_COOKIE);
  redirect(localizePath(locale, as === "customer" ? "/customer" : `/apply/${as}`));
}

export async function signOut() {
  const locale = await getRequestLocale();
  const cookieStore = await cookies();
  const signedOutRole = cookieStore.get(ACTIVE_ROLE_COOKIE)?.value;
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  cookieStore.delete(ACTIVE_ROLE_COOKIE);
  redirect(localizePath(locale, signedOutRole === "admin" ? "/staff" : "/"));
}

/** Pick which of the caller's roles is active (for users who hold more than one). */
export async function setActiveRole(formData: FormData) {
  const role = formData.get("role");
  if (!isRole(role)) throw new Error("Unknown role.");
  const sb = await createSupabaseServerClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(localizePath(await getRequestLocale(), "/sign-in"));
  const { data: roleRows, error } = await sb.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", role).limit(1);
  if (error || !roleRows?.length) throw new Error("This account does not have that role.");
  (await cookies()).set(ACTIVE_ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(localizePath(await getRequestLocale(), `/${role}`));
}
