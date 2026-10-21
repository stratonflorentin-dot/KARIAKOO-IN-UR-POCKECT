"use client";

import { useActionState } from "react";
import { beginGoogleSignIn, type AuthState } from "@/app/[lang]/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

type PublicRole = "customer" | "seller" | "rider";

export function GoogleSignInButton({ as = "customer" }: { as?: PublicRole }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(
    beginGoogleSignIn,
    { status: "idle" },
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="as" value={as} />
      <Button
        type="submit"
        variant="outline"
        size="lg"
        full
        disabled={pending}
        className="border-stone-300"
      >
        <span aria-hidden="true" className="text-lg font-extrabold text-[#4285F4]">G</span>
        {pending ? t.auth.openingGoogle : t.auth.continueWithGoogle}
      </Button>
      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {state.message ?? t.auth.googleFailed}
        </p>
      )}
    </form>
  );
}
