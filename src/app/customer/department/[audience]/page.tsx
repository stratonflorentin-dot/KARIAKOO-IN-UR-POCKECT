import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductCard";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { getCatalog } from "@/lib/catalog-source";
import { departments, isProductType, typesForDepartment } from "@/lib/departments";
import type { Audience } from "@/lib/types";

export function generateStaticParams() {
  return departments.map((d) => ({ audience: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/customer/department/[audience]">) {
  const { audience } = await params;
  return { title: departments.find((d) => d.id === audience)?.label ?? "Department" };
}

export default function DepartmentPage({ params, searchParams }: PageProps<"/customer/department/[audience]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Department params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Department({ params, searchParams }: PageProps<"/customer/department/[audience]">) {
  const { audience } = await params;
  const dept = departments.find((d) => d.id === audience);
  if (!dept) notFound();
  const rawType = (await searchParams).type;
  const type = isProductType(rawType) ? rawType : undefined;

  const catalog = await getCatalog();
  const all = catalog.searchProducts({ audience: dept.id as Audience, sort: "popular", pageSize: 48 }).items;
  // Only offer type chips that have products in this department.
  const types = typesForDepartment(dept.id as Audience).filter((t) => all.some((p) => p.productType === t.id));
  const items = type ? all.filter((p) => p.productType === type) : all;

  const chip = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition ${
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-brand-300"
    }`;

  return (
    <>
      <nav aria-label="Departments" className="flex gap-2">
        {departments.map((d) => (
          <Link key={d.id} href={`/customer/department/${d.id}`} aria-current={d.id === dept.id ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${d.id === dept.id ? "bg-brand-600 text-white" : "bg-subtle text-ink hover:bg-brand-50"}`}>
            {d.label}
          </Link>
        ))}
      </nav>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dept.label}</h1>
          <p className="text-muted">{dept.labelSw} · {items.length} {items.length === 1 ? "product" : "products"}{dept.id !== "kids" ? " (including unisex)" : ""}</p>
        </div>
        <Link href={`/customer/search?for=${dept.id}${type ? `&type=${type}` : ""}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
          <SlidersHorizontal size={15} aria-hidden="true" /> More filters
        </Link>
      </div>

      <nav aria-label={`${dept.label} product types`} className="-mx-4 mt-4 sm:mx-0">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
          <li><Link href={`/customer/department/${dept.id}`} className={chip(!type)} aria-current={!type ? "page" : undefined}>All</Link></li>
          {types.map((t) => (
            <li key={t.id}>
              <Link href={`/customer/department/${dept.id}?type=${t.id}`} className={chip(type === t.id)} aria-current={type === t.id ? "page" : undefined}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState title="Nothing here yet" body="Sellers are adding new styles every week." action={<Link href={`/customer/department/${dept.id}`} className={buttonClasses({ variant: "outline" })}>See all {dept.label}</Link>} />
        )}
      </div>
    </>
  );
}
