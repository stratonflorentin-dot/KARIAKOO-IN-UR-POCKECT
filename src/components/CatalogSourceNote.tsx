import { Database } from "lucide-react";
import { getCatalogSource } from "@/lib/catalog-source";

/** Reports the source and availability of live marketplace listings. */
export async function CatalogSourceNote({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const source = await getCatalogSource();
  return (
    <p className={`flex items-center gap-1.5 text-xs ${tone === "dark" ? "text-white/60" : "text-muted"}`}>
      <Database size={12} aria-hidden="true" />
      {source.kind === "supabase"
        ? `Live catalog · ${source.shops} shops · ${source.products} products`
        : `Live catalog unavailable · ${source.reason}`}
    </p>
  );
}
