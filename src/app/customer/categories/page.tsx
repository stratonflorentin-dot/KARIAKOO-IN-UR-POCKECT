import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { getCategories } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All categories</h1>
      <p className="mt-1 text-muted">Aina zote za bidhaa</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {getCategories().map((c) => {
          const count = catalog.getProductsByCategory(c.slug).length;
          return (
            <li key={c.slug}>
              <Link href={`/customer/category/${c.slug}`} className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-5 transition hover:border-brand-300 hover:bg-brand-50">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-night text-brand-400">
                  <CategoryIcon slug={c.slug} size={22} />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{c.name}</span>
                  <span className="block text-sm text-muted">{c.nameSw} · {count} {count === 1 ? "product" : "products"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
