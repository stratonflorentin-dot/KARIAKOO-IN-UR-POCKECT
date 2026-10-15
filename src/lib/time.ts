import { connection } from "next/server";

// The current time, read at request time on the server. `connection()` tells
// Next.js this value belongs to the request, not to a build-time prerender.
export async function nowMs(): Promise<number> {
  await connection();
  return Date.now();
}

export async function nowIso(): Promise<string> {
  return new Date(await nowMs()).toISOString();
}
