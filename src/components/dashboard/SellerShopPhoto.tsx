"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { saveSellerShopPhoto } from "@/app/[lang]/seller/profile-actions";
import { useI18n } from "@/i18n/client";
import { STORE_BANNERS_BUCKET, storeBannerPath } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, validateImageFile } from "@/lib/validation/product";

export function SellerShopPhoto({ shopId, shopName, initialUrl }: { shopId: string; shopName: string; initialUrl?: string }) {
  const { t } = useI18n();
  const labels = t.seller;
  const picker = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setMessage("");
    const problem = validateImageFile(file);
    if (problem) {
      setMessage(problem);
      return;
    }

    setBusy(true);
    const path = storeBannerPath(shopId, file.type);
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let uploaded = false;
    try {
      supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from(STORE_BANNERS_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploaded = true;

      const publicUrl = supabase.storage.from(STORE_BANNERS_BUCKET).getPublicUrl(path).data.publicUrl;
      const result = await saveSellerShopPhoto(publicUrl);
      if (!result.ok) {
        await supabase.storage.from(STORE_BANNERS_BUCKET).remove([path]).catch(() => undefined);
        uploaded = false;
        setMessage(result.error);
        return;
      }

      setImageUrl(publicUrl);
      setMessage(labels.shopPhotoSaved);
    } catch {
      if (uploaded && supabase) {
        await supabase.storage.from(STORE_BANNERS_BUCKET).remove([path]).catch(() => undefined);
      }
      setMessage(labels.shopPhotoUploadFailed);
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  return (
    <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center" aria-label={labels.shopPhotoTitle}>
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-800">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL.
          <img src={imageUrl} alt={`${shopName} shop`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-bold" aria-hidden="true">{shopName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold tracking-tight text-ink">{labels.shopPhotoTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{labels.shopPhotoDescription}</p>
        {message && <p className="mt-2 text-sm text-brand-800" role="status" aria-live="polite">{message}</p>}
      </div>
      <input ref={picker} type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => picker.current?.click()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-night px-4 text-sm font-semibold text-white hover:bg-night/90 disabled:opacity-60">
        {imageUrl ? <Camera size={16} aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
        {busy ? labels.saving : imageUrl ? labels.changeShopPhoto : labels.uploadShopPhoto}
      </button>
    </section>
  );
}
