import Link from "next/link";
import { isOnOffer } from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_10px_30px_-10px_rgba(5,150,105,0.45)] focus-within:ring-2 focus-within:ring-brand-500">
      <div className="relative">
        <ProductImage category={product.category} name={product.name} imageUrl={product.imageUrl} />
        {isOnOffer(product) && (
          <span className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">Offer</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="truncate text-xs text-muted">{product.shopName}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-[15px]">
          {/* The ::after stretches this link over the whole card: one tab stop, whole card clickable. */}
          <Link href={`/customer/product/${product.slug}`} className="outline-none after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto space-y-1.5 pt-1">
          <Price amount={product.priceTzs} compareAt={product.compareAtTzs} />
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
