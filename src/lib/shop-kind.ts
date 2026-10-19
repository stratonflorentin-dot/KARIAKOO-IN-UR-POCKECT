// Every shop has a clear type, taken from its primary (first) category, so
// customers can tell a pharmacy from a restaurant from a phone shop at a
// glance. Each type has its own label and accent colour.
import type { CategorySlug, Shop } from "@/lib/types";

export const shopKindLabel: Record<CategorySlug, string> = {
  electronics: "Electronics shop",
  fashion: "Fashion boutique",
  shoes: "Shoe shop",
  fabrics: "Fabrics & tailoring",
  accessories: "Accessories boutique",
  "home-kitchen": "Household store",
  beauty: "Beauty shop",
  groceries: "Grocery store",
  hardware: "Hardware store",
  kids: "Kids & baby shop",
  pharmacy: "Pharmacy",
  stationery: "Stationery shop",
  sports: "Sports shop",
  "auto-parts": "Auto spares shop",
  furniture: "Furniture store",
  food: "Restaurant & food",
};

/** Accent (background + text) used for the shop's mark and type badge. */
export const shopKindAccent: Record<CategorySlug, string> = {
  electronics: "bg-stone-900 text-brand-300",
  fashion: "bg-brand-100 text-brand-800",
  shoes: "bg-gold-300 text-ink",
  fabrics: "bg-brand-600 text-white",
  accessories: "bg-brand-900 text-brand-100",
  "home-kitchen": "bg-stone-200 text-stone-800",
  beauty: "bg-rose-100 text-rose-900",
  groceries: "bg-lime-100 text-lime-900",
  hardware: "bg-zinc-200 text-zinc-800",
  kids: "bg-sky-100 text-sky-900",
  pharmacy: "bg-emerald-700 text-white",
  stationery: "bg-indigo-100 text-indigo-900",
  sports: "bg-brand-100 text-brand-800",
  "auto-parts": "bg-stone-700 text-white",
  furniture: "bg-gold-400 text-ink",
  food: "bg-red-700 text-white",
};

export function shopKind(shop: Pick<Shop, "categories">): CategorySlug {
  return shop.categories[0];
}
