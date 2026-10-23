// Shared Supabase Storage helpers for product images. Isomorphic (no Supabase
// import), so both the browser uploader and the server action can use them.
// Objects live under product-images/{shopId}/..., which the storage RLS policy
// enforces: a seller can only write under a shop id they own.

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const STORE_BANNERS_BUCKET = "store-banners";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** File extension for an accepted image MIME type (jpg fallback). */
export function imageExtForType(type: string): string {
  return EXT_BY_TYPE[type] ?? "jpg";
}

/** The storage object path a seller's product image is uploaded to. */
export function productImagePath(shopId: string, type: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${shopId}/${id}.${imageExtForType(type)}`;
}

/** The public-URL prefix for a shop's product images, for validating saves. */
export function productImagePublicPrefix(supabaseUrl: string, shopId: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${shopId}/`;
}
