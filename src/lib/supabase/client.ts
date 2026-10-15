"use client";

// Supabase client for the browser. Uses only the publishable key, so it can
// do nothing beyond what Row Level Security permits. NOT USED YET.
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicEnv();
  return createBrowserClient(url, key);
}
