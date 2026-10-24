"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhoneIncoming } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "@/components/i18n/Link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type IncomingCall = {
  order_id: string;
  order_reference: string;
  caller_id: string;
  created_at: string;
};

/** Keeps a customer aware of a rider's call throughout the customer area. */
export function IncomingDeliveryCallNotice() {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [call, setCall] = useState<IncomingCall | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCall(null);
      return;
    }
    const { data, error } = await client.rpc("delivery_call_incoming_poll");
    if (error) return;
    const incoming = (data as IncomingCall[] | null)?.[0] ?? null;
    setCall(incoming && incoming.caller_id !== userId ? incoming : null);
  }, [client, userId]);

  useEffect(() => {
    let alive = true;
    void client.auth.getUser().then(({ data: { user } }) => {
      if (alive) setUserId(user?.id ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (!session?.user) setCall(null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    if (!userId) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2_000);
    const channel = client.channel("customer-incoming-delivery-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_calls" }, () => void refresh())
      .subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [client, refresh, userId]);

  if (!call || !userId || pathname?.includes(`/customer/orders/${call.order_id}`)) return null;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" role="alertdialog" aria-modal="true" aria-labelledby="customer-incoming-call-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><PhoneIncoming size={18} aria-hidden="true" /> Incoming delivery call</p>
        <h2 id="customer-incoming-call-title" className="mt-2 text-xl font-bold">Your rider is calling</h2>
        <p className="mt-1 text-sm text-muted">Delivery {call.order_reference}</p>
        <Link href={`/customer/orders/${call.order_id}`} className="mt-5 flex h-12 items-center justify-center rounded-full bg-emerald-700 px-4 font-semibold text-white">
          Open delivery to answer
        </Link>
      </div>
    </div>
  );
}
