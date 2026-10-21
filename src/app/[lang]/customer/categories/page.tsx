import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";
import { getCategories } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-source";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.categories };
}

export default async function CategoriesPage() {
  const catalog = await getCatalog();
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.catalog.allCategories}</h1>
      <p className="mt-1 text-muted">{t.catalog.browseByCategory}</p>
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
                  <span className="block font-semibold text-ink">{t.categories[c.slug as keyof Dictionary["categories"]] ?? c.name}</span>
                  <span className="block text-sm text-muted">{count === 1 ? t.catalog.product : fmt(t.catalog.products, { count })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
