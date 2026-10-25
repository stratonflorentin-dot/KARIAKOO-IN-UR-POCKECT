import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ShareAction } from "@/components/ui/ShareAction";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getCategories, getCategory } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/customer/category/[slug]">) {
  const { slug } = await params;
  return { title: getCategory(slug)?.name ?? "Category" };
}

export default function CategoryPage({ params }: PageProps<"/[lang]/customer/category/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <CategoryContent params={params} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/[lang]/customer/category/[slug]">, "params">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const allCategories = getCategories();
  const { items } = (await getCatalog()).searchProducts({ category: category.slug, sort: "popular", pageSize: 48 });

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/customer" className="hover:text-ink">Home</Link> /{" "}
        <Link href="/customer/categories" className="hover:text-ink">Categories</Link> /{" "}
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-night text-brand-400">
            <CategoryIcon slug={category.slug} size={20} />
          </span>
          {category.name}
        </h1>
        <div className="flex items-center gap-2">
          <ShareAction
            title={`${category.name} — Kariakoo`}
            text={`Tazama bidhaa za ${category.name} kwenye Kariakoo Market`}
            label="Share category"
            variant="pill"
          />
          <Link
            href={`/customer/search?category=${category.slug}`}
            className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            Filter &amp; sort
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{category.nameSw} · {items.length} {items.length === 1 ? "product" : "products"}</p>

      {/* Horizontal Category Switcher Bar (Screen 4 mockup) */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/customer/categories"
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink transition hover:border-brand-300"
        >
          All Categories
        </Link>
        {allCategories.map((c) => {
          const isActive = c.slug === category.slug;
          return (
            <Link
              key={c.slug}
              href={`/customer/category/${c.slug}`}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-line bg-white text-ink hover:border-brand-300"
              }`}
            >
              <span>{c.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        {items.length > 0 ? <ProductGrid products={items} /> : <EmptyState title="No products in this category yet" body="Check back soon: new Kariakoo sellers join every week." />}
      </div>
    </>
  );
}
