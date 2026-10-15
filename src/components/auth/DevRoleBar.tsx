import Link from "next/link";
import { DEMO_ROLE_PREVIEW_ENABLED } from "@/lib/auth/demo-mode";
import { getSession } from "@/lib/auth/session";

/** Thin development-only bar showing the previewed identity. Renders nothing in production. */
export async function DevRoleBar() {
  if (!DEMO_ROLE_PREVIEW_ENABLED) return null;
  const session = await getSession();
  return (
    <div className="flex items-center justify-center gap-2 bg-night px-4 py-1.5 text-xs text-white/80">
      <span>
        Dev preview: {session ? <strong className="text-white">{session.displayName} ({session.role})</strong> : "signed out"}
      </span>
      <Link href="/dev" className="font-semibold text-brand-300 underline-offset-2 hover:underline">
        Switch role
      </Link>
    </div>
  );
}
