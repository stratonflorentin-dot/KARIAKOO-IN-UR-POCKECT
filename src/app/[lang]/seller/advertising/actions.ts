"use server";

import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { PRODUCT_IMAGES_BUCKET, productImagePath, productImagePublicPrefix } from "@/lib/storage";
import { validateImageFile } from "@/lib/validation/product";
import { promotionDraftSchema } from "@/lib/validation/promotion";

export interface PromotionActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPromotion(_prev: PromotionActionState, formData: FormData): Promise<PromotionActionState> {
  const session = await getSessionWithRole("seller");
  if (!session) return { status: "error", message: "Sign in with your seller account to publish a promotion." };

  const imageFile = formData.get("imageFile");
  const hasImageFile = imageFile instanceof File && imageFile.size > 0;
  const parsed = promotionDraftSchema.safeParse({
    kind: formData.get("kind"), title: formData.get("title"), body: formData.get("body"),
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || (hasImageFile ? "https://uploaded-photo.pending" : ""),
    linkProductId: formData.get("linkProductId"),
    expiresIn: formData.get("expiresIn"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your promotion details." };

  const sb = await createSupabaseServerClient();
  const { data: shopRow, error: shopError } = await sb.from("shops")
    .select("id,status").eq("owner_id", session.userId).limit(1);
  if (shopError) return { status: "error", message: "Could not verify your shop. Please retry." };
  const shop = (shopRow?.[0] as { id: string; status: string } | undefined);
  if (!shop) return { status: "error", message: "Apply for a shop before creating promotions." };
  if (shop.status !== "approved") return { status: "error", message: "Your shop must be approved before promotions appear to customers." };

  const draft = parsed.data;
  if (draft.linkProductId) {
    const { data: product } = await sb.from("products").select("id")
      .eq("id", draft.linkProductId).eq("shop_id", shop.id).eq("status", "active").limit(1);
    if (!product?.length) return { status: "error", message: "Choose an active product from your own shop." };
  }

  let imageUrl = parsed.data.imageUrl ?? null;
  let uploadedPath: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    const fileProblem = validateImageFile(imageFile);
    if (fileProblem) return { status: "error", message: fileProblem };
    uploadedPath = productImagePath(shop.id, imageFile.type);
    const { error: uploadError } = await sb.storage.from(PRODUCT_IMAGES_BUCKET).upload(uploadedPath, imageFile, {
      contentType: imageFile.type,
      upsert: false,
    });
    if (uploadError) return { status: "error", message: "The photo could not be uploaded. Check your connection and try again." };
    imageUrl = sb.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
  }
  const { url: supabaseUrl } = getSupabasePublicEnv();
  if (imageUrl?.startsWith(`${supabaseUrl.replace(/\/+$/, "")}/storage/`)) {
    const prefix = productImagePublicPrefix(supabaseUrl, shop.id);
    if (!imageUrl.startsWith(prefix)) return { status: "error", message: "Choose a photo from your own shop or upload it again." };
  }

  const expiresAt = draft.expiresIn === "always" ? null : new Date(Date.now() + ({ "1day": 1, "3days": 3, "7days": 7 }[draft.expiresIn] * 86_400_000)).toISOString();
  const { error } = await sb.from("shop_promotions").insert({
    shop_id: shop.id,
    kind: draft.kind,
    title: draft.title ?? null,
    body: draft.body ?? null,
    image_url: imageUrl,
    link_product_id: draft.linkProductId ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    if (uploadedPath) await sb.storage.from(PRODUCT_IMAGES_BUCKET).remove([uploadedPath]);
    return { status: "error", message: "Could not publish the promotion. Check the details and try again." };
  }

  revalidatePath("/[lang]/seller/advertising", "page");
  revalidatePath("/[lang]/customer", "page");
  return { status: "success", message: "Promotion published to the customer store." };
}

export async function deletePromotion(formData: FormData): Promise<void> {
  const session = await getSessionWithRole("seller");
  const id = String(formData.get("id") ?? "");
  if (!session || !UUID.test(id)) return;
  const sb = await createSupabaseServerClient();
  const { data: shopRows } = await sb.from("shops").select("id").eq("owner_id", session.userId).limit(1);
  const shopId = (shopRows?.[0] as { id?: string } | undefined)?.id;
  if (!shopId) return;
  await sb.from("shop_promotions").delete().eq("id", id).eq("shop_id", shopId);
  revalidatePath("/[lang]/seller/advertising", "page");
  revalidatePath("/[lang]/customer", "page");
}
