"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role";
import { isRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthState {
  status: "idle" | "error" | "ok";
  message?: string;
}

/** Turn Supabase's raw auth errors into plain, honest guidance. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email or password is not correct.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try signing in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("email") && m.includes("invalid")) return "Please enter a valid email address.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "New sign-ups are currently disabled.";
  if (m.includes("password")) return message; // length/strength messages are already clear
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: "Enter your email and password." };

  const as = String(formData.get("as") ?? "customer");

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: friendlyAuthError(error?.message ?? "") };

  // Seller / rider logins land in that area when the account holds the role;
  // otherwise on the application page, which shows their status or the form.
  if (as === "seller" || as === "rider") {
    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", as).limit(1);
    if (roleRows && roleRows.length > 0) {
      (await cookies()).set(ACTIVE_ROLE_COOKIE, as, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      redirect(`/${as}`);
    }
    redirect(`/apply/${as}`);
  }
  redirect("/customer");
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
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error", message: "Enter the email you signed up with." };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error && error.message.toLowerCase().includes("rate limit")) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }
  return { status: "ok", message: "If that email has a KARIAKOO account, a reset link is on its way. Check your inbox." };
}

/** Set a new password for the user signed in through the reset link. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { status: "error", message: "Use a password of at least 8 characters." };

  const sb = await createSupabaseServerClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { status: "error", message: "This reset link has expired. Request a new one." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { status: "error", message: friendlyAuthError(error.message) };
  redirect("/customer");
}

/**
 * Staff / admin sign-in, kept separate from the public customer entrance.
 * Admins are never minted from a form: user_roles has no client write policy,
 * so this just authenticates and then checks the signed-in user actually holds
 * the `admin` role. A non-admin who signs in here is signed back out — the
 * staff door never drops a normal user into the dashboard area.
 */
export async function signInStaff(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: "Enter your staff email and password." };

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: friendlyAuthError(error?.message ?? "") };

  const { data: roleRows } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .limit(1);

  if (!roleRows || roleRows.length === 0) {
    // Authenticated, but not staff: don't leave them holding a session here.
    await sb.auth.signOut();
    return { status: "error", message: "This entrance is for KARIAKOO staff only. Please use the main sign in." };
  }

  (await cookies()).set(ACTIVE_ROLE_COOKIE, "admin", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/admin");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (fullName.length < 2) return { status: "error", message: "Please enter your name." };
  if (!email) return { status: "error", message: "Enter your email." };
  if (password.length < 8) return { status: "error", message: "Use a password of at least 8 characters." };

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { status: "error", message: friendlyAuthError(error.message) };
  // When email confirmation is on, there is no session yet.
  if (!data.session) return { status: "ok", message: "Account created. Check your email to confirm it, then sign in." };
  redirect("/customer");
}

export async function signOut() {
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  (await cookies()).delete(ACTIVE_ROLE_COOKIE);
  redirect("/");
}

/** Pick which of the caller's roles is active (for users who hold more than one). */
export async function setActiveRole(formData: FormData) {
  const role = formData.get("role");
  if (!isRole(role)) throw new Error("Unknown role.");
  // getSession only honours this cookie if the signed-in user actually holds
  // the role, so setting it is safe even without re-checking here.
  (await cookies()).set(ACTIVE_ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/${role}`);
}
