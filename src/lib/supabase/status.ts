import "server-only";

export type SupabaseStatus =
  | { state: "not_configured" }
  | { state: "reachable"; url: string }
  | { state: "unreachable"; url: string; detail: string };

/** Live check: is Supabase configured and is its Auth service answering? */
export async function getSupabaseStatus(): Promise<SupabaseStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { state: "not_configured" };
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? { state: "reachable", url } : { state: "unreachable", url, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { state: "unreachable", url, detail: err instanceof Error ? err.message : "Network error" };
  }
}
