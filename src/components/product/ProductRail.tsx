import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductRail({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul aria-label={label} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
      {products.map((product) => (
        <li key={product.id} className="w-[44%] max-w-56 shrink-0 snap-start sm:w-[30%] lg:w-[22%]">
          <ProductCard product={product} quickAdd />
        </li>
      ))}
    </ul>
  );
}
