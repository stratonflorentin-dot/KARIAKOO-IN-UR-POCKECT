"use client";

// Sign-in, sign-up and password-reset forms. All post to server actions that
// talk to Supabase Auth; errors come back as plain messages. No password is
// ever handled here beyond passing it to the server action over the form POST.
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState, type ComponentType, type InputHTMLAttributes } from "react";
import {
  requestPasswordReset,
  signIn,
  signInStaff,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";

const iconInputClass =
  "block min-h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-base text-ink shadow-sm shadow-stone-950/[0.02] outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

function Status({ state }: { state: AuthState }) {
  if (state.status === "idle") return null;
  if (state.status === "ok") return <Notice tone="success">{state.message}</Notice>;
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {state.message}
    </p>
  );
}

/** A labelled input with a leading icon; the label is for screen readers. */
function IconField({
  id,
  label,
  Icon,
  ...input
}: { id: string; label: string; Icon: ComponentType<{ size?: number; className?: string }> } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-700" aria-hidden="true" />
      <input id={id} placeholder={label} className={iconInputClass} {...input} />
    </div>
  );
}

/** Password input with a show / hide toggle. */
function PasswordField({ id, label = "Password", autoComplete, minLength }: { id: string; label?: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-700" aria-hidden="true" />
      <input
        id={id}
        name="password"
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        placeholder={label}
        className={`${iconInputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-ink"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function SignInForm({ as = "customer" }: { as?: "customer" | "seller" | "rider" }) {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="as" value={as} />
      <IconField id={`${id}-email`} label="Email address" Icon={Mail} name="email" type="email" autoComplete="email" required />
      <PasswordField id={`${id}-password`} autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link>
      </div>
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function StaffSignInForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(signInStaff, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <IconField id={`${id}-email`} label="Staff email" Icon={Mail} name="email" type="email" autoComplete="email" required />
      <PasswordField id={`${id}-password`} autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link>
      </div>
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <IconField id={`${id}-name`} label="Full name" Icon={User} name="full_name" type="text" autoComplete="name" required />
      <IconField id={`${id}-email`} label="Email address" Icon={Mail} name="email" type="email" autoComplete="email" required />
      <PasswordField id={`${id}-password`} label="Password (8+ characters)" autoComplete="new-password" minLength={8} />
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <IconField id={`${id}-email`} label="Email address" Icon={Mail} name="email" type="email" autoComplete="email" required />
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <PasswordField id={`${id}-password`} label="New password (8+ characters)" autoComplete="new-password" minLength={8} />
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
