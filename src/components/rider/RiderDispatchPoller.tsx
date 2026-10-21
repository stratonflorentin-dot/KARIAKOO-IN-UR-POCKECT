"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh server-rendered offers while the rider dashboard stays open. */
export function RiderDispatchPoller() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
