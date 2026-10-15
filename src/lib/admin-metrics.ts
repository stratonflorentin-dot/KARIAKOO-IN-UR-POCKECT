import "server-only";

// Platform-level figures for the founder dashboard. Definitions matter:
//  - GMV is the value of goods sold through KARIAKOO. It is NOT revenue.
//  - Platform revenue = commission + delivery fees collected.
//  - Delivery contribution = delivery fees − rider payouts (before other costs).
//  - Operating costs aren't tracked yet, so no profit figure is shown.
import { assertRole, type Session } from "@/lib/auth/session";
import { adminData } from "@/lib/data/access";
import { breakdown, orderTotals } from "@/lib/money";
import type { Order } from "@/lib/types";

const isPaidSale = (o: Order) => o.paymentStatus === "successful" && o.status !== "cancelled";
const riderWasPaid = (o: Order) => ["DELIVERED", "FAILED"].includes(o.delivery.status);

export function platformMetrics(session: Session | null) {
  assertRole(session, "admin");
  const { orders, shops, customers, riders } = adminData(session);
  const sales = orders.filter(isPaidSale);
  const salesItems = sales.flatMap((o) => o.items);
  const b = breakdown(salesItems);
  const deliveryFees = sales.reduce((s, o) => s + o.deliveryFeeTzs, 0);
  const riderPayouts = orders.filter(riderWasPaid).reduce((s, o) => s + o.delivery.riderPayoutTzs, 0);
  const refunds = orders.filter((o) => o.paymentStatus === "refunded").reduce((s, o) => s + orderTotals(o.items, o.deliveryFeeTzs).customerTotalTzs, 0);
  const pendingPayments = orders.filter((o) => o.paymentStatus === "pending");
  const pendingSettlement = orders
    .flatMap((o) => o.groups.filter((g) => g.settlement === "pending").map((g) => breakdown(o.items.filter((i) => i.shopId === g.shopId)).sellerProceedsTzs))
    .reduce((s, v) => s + v, 0);

  return {
    totalOrders: orders.length,
    gmvTzs: b.merchandiseTzs,
    commissionTzs: b.commissionTzs,
    deliveryFeesTzs: deliveryFees,
    riderPayoutsTzs: riderPayouts,
    deliveryContributionTzs: deliveryFees - riderPayouts,
    platformRevenueTzs: b.commissionTzs + deliveryFees,
    refundsTzs: refunds,
    pendingPaymentsCount: pendingPayments.length,
    pendingPaymentsTzs: pendingPayments.reduce((s, o) => s + orderTotals(o.items, o.deliveryFeeTzs).customerTotalTzs, 0),
    pendingSettlementTzs: pendingSettlement,
    activeCustomers: customers.filter((c) => c.status === "active").length,
    activeShops: shops.filter((s) => s.status === "approved").length,
    activeRiders: riders.filter((r) => r.status === "approved").length,
    attention: {
      awaitingSeller: orders.filter((o) => o.groups.some((g) => g.status === "awaiting_seller")),
      awaitingRider: orders.filter((o) => o.delivery.status === "PENDING_ASSIGNMENT" && o.status !== "cancelled"),
      failedDeliveries: orders.filter((o) => o.delivery.status === "FAILED"),
      pendingShops: shops.filter((s) => s.status === "pending"),
      pendingRiders: riders.filter((r) => r.status === "pending"),
    },
    sales,
  };
}
