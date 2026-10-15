import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { shopKind, shopKindAccent, shopKindLabel } from "@/lib/shop-kind";
import type { Shop } from "@/lib/types";

/** The shop's "logo": an accent tile with its shop-type icon. */
export function ShopMark({ shop, size = "md" }: { shop: Pick<Shop, "categories">; size?: "sm" | "md" | "lg" }) {
  const kind = shopKind(shop);
  const box = { sm: "h-8 w-8 rounded-lg", md: "h-12 w-12 rounded-xl", lg: "h-16 w-16 rounded-2xl" }[size];
  const icon = { sm: 16, md: 22, lg: 30 }[size];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${box} ${shopKindAccent[kind]}`}>
      <CategoryIcon slug={kind} size={icon} />
    </span>
  );
}

export function ShopKindBadge({ shop }: { shop: Pick<Shop, "categories"> }) {
  const kind = shopKind(shop);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${shopKindAccent[kind]}`}>
      <CategoryIcon slug={kind} size={12} />
      {shopKindLabel[kind]}
    </span>
  );
}
