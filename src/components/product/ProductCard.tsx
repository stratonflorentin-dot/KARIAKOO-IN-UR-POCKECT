import Link from "@/components/i18n/Link";
import { isOnOffer } from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { OfferBadge, StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm shadow-stone-950/[0.025] transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_16px_40px_-22px_rgba(5,150,105,0.5)] focus-within:ring-2 focus-within:ring-brand-500">
      <div className="relative">
        <ProductImage category={product.category} name={product.name} imageUrl={product.imageUrl} />
        {isOnOffer(product) && <OfferBadge />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <p className="truncate text-xs font-medium text-muted">{product.shopName}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-ink sm:text-[15px]">
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
