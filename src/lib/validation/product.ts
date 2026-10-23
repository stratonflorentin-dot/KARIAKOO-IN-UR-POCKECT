import { z } from "zod";
import { categories } from "@/data/categories";
import { audiences, productTypes } from "@/lib/departments";

// Shared rules for a seller's product form and its Supabase Storage uploads.

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_IMAGE_BYTES) return "The photo must be 5 MB or smaller.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

const categoryIds = categories.map((c) => c.slug) as [string, ...string[]];
const audienceIds = audiences.map((a) => a.id) as [string, ...string[]];
const typeIds = productTypes.map((t) => t.id) as [string, ...string[]];

export const productDraftSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters.").max(120, "Keep the name under 120 characters."),
  category: z.enum(categoryIds, { message: "Choose a category." }),
  audience: z.enum(audienceIds).optional(),
  productType: z.enum(typeIds).optional(),
  priceTzs: z.coerce.number().int("Whole shillings only.").min(100, "At least TSh 100.").max(50_000_000, "At most TSh 50,000,000."),
  stock: z.coerce.number().int("Whole number only.").min(0, "Can't be negative.").max(100_000, "At most 100,000."),
  description: z.string().trim().min(20, "Describe the product in at least 20 characters.").max(1000, "Keep it under 1,000 characters."),
});

export type ProductDraft = z.infer<typeof productDraftSchema>;
