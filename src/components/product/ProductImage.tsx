import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { safeImageUrl } from "@/lib/product-utils";
import type { CategorySlug } from "@/lib/types";

// Shows the seller's photo when there is one; otherwise an illustrated
// placeholder with a tint and icon per category (green/gold brand palette).
const tints: Record<CategorySlug, string> = {
  electronics: "from-stone-900 to-stone-700 text-brand-300",
  fashion: "from-brand-100 to-brand-50 text-brand-800",
  shoes: "from-gold-300 to-white text-ink",
  fabrics: "from-brand-500 to-brand-300 text-white",
  accessories: "from-stone-800 to-brand-900 text-brand-200",
  "home-kitchen": "from-stone-200 to-white text-stone-800",
  beauty: "from-rose-200 to-white text-rose-900",
  groceries: "from-lime-200 to-white text-lime-900",
  hardware: "from-zinc-300 to-stone-100 text-zinc-800",
  kids: "from-sky-200 to-white text-sky-900",
  pharmacy: "from-emerald-100 to-white text-emerald-800",
  stationery: "from-indigo-100 to-white text-indigo-900",
  sports: "from-brand-200 to-white text-brand-800",
  "auto-parts": "from-stone-700 to-stone-500 text-white",
  furniture: "from-gold-400 to-gold-300 text-ink",
  food: "from-red-200 to-white text-red-900",
};

export function ProductImage({ category, name, imageUrl, size = "md" }: {
  category: CategorySlug;
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = safeImageUrl(imageUrl);
  if (src) {
    return (
      <div className="relative aspect-square w-full overflow-hidden bg-subtle">
        {/* Plain <img>: seller photos come from Supabase Storage (and blob: previews). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
    );
  }

  const iconSize = { sm: 28, md: 56, lg: 120 }[size];
  return (
    <div
      role="img"
      aria-label={`${name}, illustration`}
      className={`relative grid aspect-square w-full place-items-center overflow-hidden bg-gradient-to-br ${tints[category]}`}
    >
      <div aria-hidden="true" className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-black/5" />
      <CategoryIcon slug={category} size={iconSize} strokeWidth={1.4} />
      {size !== "sm" && (
        <span className="absolute bottom-2 left-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
          Illustration
        </span>
      )}
    </div>
  );
}
