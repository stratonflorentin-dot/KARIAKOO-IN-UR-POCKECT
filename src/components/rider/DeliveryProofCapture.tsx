"use client";

// Proof of delivery: the rider snaps a photo at hand-over. It uploads to the
// PRIVATE delivery-proof bucket (storage RLS lets only the assigned rider write
// under this order's folder) and is recorded against the order. Only the
// customer, the rider, and admins can ever see it.
import { Camera, Check } from "lucide-react";
import { useRef, useState } from "react";
import { addDeliveryProof } from "@/app/[lang]/rider/actions";
import { DELIVERY_PROOF_BUCKET, deliveryProofObjectPath } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateImageFile } from "@/lib/validation/product";

type State = "idle" | "uploading" | "done" | "error";

export function DeliveryProofCapture({ orderId }: { orderId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setState("error");
      setMessage(problem);
      return;
    }
    setState("uploading");
    setMessage("");
    try {
      const sb = createSupabaseBrowserClient();
      const path = deliveryProofObjectPath(orderId, file.type);
      const { error: upErr } = await sb.storage.from(DELIVERY_PROOF_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const res = await addDeliveryProof(orderId, path);
      if (!res.ok) throw new Error(res.error ?? "save failed");
      setState("done");
      setMessage("Proof photo saved.");
    } catch {
      setState("error");
      setMessage("Could not save the photo. Please try again.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Camera size={16} aria-hidden="true" /> Proof of delivery</p>
      <p className="mt-1 text-xs text-muted">
        Take a photo at hand-over (e.g. the parcel with the customer). Only the customer and dispatch can see it.
      </p>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={state === "uploading"}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-night px-4 text-sm font-semibold text-white disabled:opacity-70"
      >
        {state === "done" ? <><Check size={15} aria-hidden="true" /> Photo saved — take another</> : state === "uploading" ? "Uploading…" : "Take delivery photo"}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {message && <p role="status" aria-live="polite" className={`mt-2 text-xs ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
