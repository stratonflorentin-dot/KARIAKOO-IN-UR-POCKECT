"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { localizePath, type Locale } from "@/i18n/config";
import { dictionaryFor, type Dictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/server";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
import { isRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const as = String(formData.get("as") ?? "customer");

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: friendlyAuthError(error?.message ?? "", e) };

  // Seller / rider logins land in that area when the account holds the role;
  // otherwise on the application page, which shows their status or the form.
  if (as === "seller" || as === "rider") {
    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", as).limit(1);
    if (roleRows && roleRows.length > 0) {
      (await cookies()).set(ACTIVE_ROLE_COOKIE, as, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      redirect(localizePath(locale, `/${as}`));
    }
    redirect(localizePath(locale, `/apply/${as}`));
  }
  redirect(localizePath(locale, "/customer"));
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
  redirect(localizePath(locale, "/customer"));
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
  if (fullName.length < 2) return { status: "error", message: e.enterName };
  if (!email) return { status: "error", message: e.enterEmail };
  if (password.length < 8) return { status: "error", message: e.passwordShort };

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { status: "error", message: friendlyAuthError(error.message, e) };
  // When email confirmation is on, there is no session yet.
  if (!data.session) return { status: "ok", message: e.accountCreated };
  redirect(localizePath(locale, "/customer"));
}

export async function signOut() {
  const locale = await getRequestLocale();
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  (await cookies()).delete(ACTIVE_ROLE_COOKIE);
  redirect(localizePath(locale, "/"));
}

/** Pick which of the caller's roles is active (for users who hold more than one). */
export async function setActiveRole(formData: FormData) {
  const role = formData.get("role");
  if (!isRole(role)) throw new Error("Unknown role.");
  // getSession only honours this cookie if the signed-in user actually holds
  // the role, so setting it is safe even without re-checking here.
  (await cookies()).set(ACTIVE_ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(localizePath(await getRequestLocale(), `/${role}`));
}
