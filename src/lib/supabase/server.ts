import "server-only";

// Supabase client for Server Components, Server Actions and Route Handlers.
// It acts as the signed-in user (via auth cookies), so Row Level Security
// applies to every query. NOT USED YET: wired up for Milestone 2.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, key } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh will be handled in proxy.ts in Milestone 2.
        }
      },
    },
  });
}
