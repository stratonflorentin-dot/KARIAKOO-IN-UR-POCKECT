import { Badge } from "@/components/ui/Badge";
import { stockLevel } from "@/lib/product-utils";

export function StockBadge({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  if (level === "out") return <Badge tone="neutral">Out of stock</Badge>;
  if (level === "low") return <Badge tone="warning">Only {stock} left</Badge>;
  return <Badge tone="success">In stock</Badge>;
}
