import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getCategories, getCategory, searchProducts } from "@/lib/catalog";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/customer/category/[slug]">) {
  const { slug } = await params;
  return { title: getCategory(slug)?.name ?? "Category" };
}

export default function CategoryPage({ params }: PageProps<"/customer/category/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <CategoryContent params={params} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/customer/category/[slug]">, "params">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const { items } = searchProducts({ category: category.slug, sort: "popular", pageSize: 48 });

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/customer" className="hover:text-ink">Home</Link> /{" "}
        <Link href="/customer/categories" className="hover:text-ink">Categories</Link> /{" "}
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-night text-brand-400"><CategoryIcon slug={category.slug} size={20} /></span>
          {category.name}
        </h1>
        <Link href={`/customer/search?category=${category.slug}`} className="text-sm font-medium text-brand-700 hover:underline">
          Filter &amp; sort
        </Link>
      </div>
      <p className="mt-1 text-muted">{category.nameSw} · {items.length} {items.length === 1 ? "product" : "products"}</p>
      <div className="mt-6">
        {items.length > 0 ? <ProductGrid products={items} /> : <EmptyState title="No products in this category yet" body="Check back soon: new Kariakoo sellers join every week." />}
      </div>
    </>
  );
}
