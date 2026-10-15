import { Database } from "lucide-react";
import { getCatalogSource } from "@/lib/catalog-source";

/** Shows where the catalog currently comes from: Supabase or the demo files. */
export async function CatalogSourceNote({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const source = await getCatalogSource();
  return (
    <p className={`flex items-center gap-1.5 text-xs ${tone === "dark" ? "text-white/60" : "text-muted"}`}>
      <Database size={12} aria-hidden="true" />
      {source.kind === "supabase"
        ? `Catalog: live from Supabase (${source.shops} shops, ${source.products} products, demo data)`
        : `Catalog: demo files (${source.reason})`}
    </p>
  );
}
