"use client";

// Sign-in and sign-up forms. Both post to server actions that talk to Supabase
// Auth; errors come back as plain messages. No password is ever handled here
// beyond passing it to the server action over the form POST.
import { useActionState, useId } from "react";
import { signIn, signInStaff, signUp, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";

function Status({ state }: { state: AuthState }) {
  if (state.status === "idle") return null;
  if (state.status === "ok") return <Notice tone="success">{state.message}</Notice>;
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {state.message}
    </p>
  );
}

export function SignInForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, { status: "idle" });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-email`} className="text-sm font-medium text-ink">Email</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className="text-sm font-medium text-ink">Password</label>
        <input id={`${id}-password`} name="password" type="password" autoComplete="current-password" required className={inputClass} />
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
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-email`} className="text-sm font-medium text-ink">Staff email</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className="text-sm font-medium text-ink">Password</label>
        <input id={`${id}-password`} name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <Status state={state} />
      <Button type="submit" variant="dark" size="lg" full disabled={pending}>
        {pending ? "Signing in…" : "Sign in to staff area"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const id = useId();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, { status: "idle" });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">Full name</label>
        <input id={`${id}-name`} name="full_name" type="text" autoComplete="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="text-sm font-medium text-ink">Email</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className="text-sm font-medium text-ink">Password</label>
        <input id={`${id}-password`} name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      <Status state={state} />
      <Button type="submit" variant="primary" size="lg" full disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
