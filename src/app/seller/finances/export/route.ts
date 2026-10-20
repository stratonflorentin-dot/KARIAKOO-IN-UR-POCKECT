// CSV sales report for the signed-in seller. Authorization is checked on the
// server: only a seller session gets data, and only for their own shop.
import { getSessionWithRole } from "@/lib/auth/session";
import { liveSellerOrders, liveSellerShop } from "@/lib/data/seller-live";
import { breakdown } from "@/lib/money";

function csvCell(value: string | number): string {
  const s = String(value);
  // Quote everything and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getSessionWithRole("seller");
  if (!session) return new Response("Forbidden", { status: 403 });

  const shop = await liveSellerShop(session);
  if (!shop) return new Response("Shop not found", { status: 404 });
  const shopId = shop.id;
  const orders = await liveSellerOrders(session, shop.id);
  const rows = orders.map((o) => {
    const b = breakdown(o.items);
    return [o.reference, o.placedAt, o.paymentStatus, o.fulfillmentStatus, o.settlementStatus, b.merchandiseTzs, o.items[0]?.commissionBps ? o.items[0].commissionBps / 100 : 0, b.commissionTzs, b.sellerProceedsTzs];
  });
  const header = ["order_reference", "placed_at", "payment_status", "fulfilment_status", "settlement_status", "merchandise_tzs", "commission_percent", "commission_tzs", "seller_proceeds_tzs"];
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new Response(`${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kariakoo-sales-${shopId}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
