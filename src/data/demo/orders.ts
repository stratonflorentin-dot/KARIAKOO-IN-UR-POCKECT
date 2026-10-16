import type { Order } from "@/lib/types";

// DEMO DATA: fictional orders. Item prices and commission rates are
// snapshots from "order time", exactly as real orders will store them.
// Delivery PINs live in ./delivery-pins.ts, which only the server reads.
export const demoOrders: Order[] = [
  {
    id: "ord-101", reference: "KK-260101", customerId: "cust-001", placedAt: "2026-10-10T14:05:00+03:00",
    zone: "kinondoni", address: "Mikocheni B, near Rose Garden Rd", instructions: "Call at the gate",
    status: "delivered", paymentStatus: "successful", paymentMethod: "mpesa", deliveryFeeTzs: 5_000,
    items: [
      { productId: "prd-001", shopId: "shop-001", productName: "Tecno Spark 20 (128GB, Dual SIM)", unitPriceTzs: 345_000, quantity: 1, commissionBps: 1000 },
      { productId: "prd-002", shopId: "shop-001", productName: "Oraimo Power Bank 20,000mAh", unitPriceTzs: 55_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-001", status: "delivered", settlement: "settled" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-001", riderPayoutTzs: 3_500,
      history: [
        { label: "Rider assigned", at: "2026-10-10T15:00:00+03:00", actor: "admin" },
        { label: "Picked up from Msimbazi Mobile Hub", at: "2026-10-10T15:40:00+03:00", actor: "rider" },
        { label: "Delivered (PIN verified)", at: "2026-10-10T16:35:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-10T14:05:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-10T14:06:00+03:00", actor: "system" },
      { label: "Accepted by shop", at: "2026-10-10T14:20:00+03:00", actor: "seller" },
      { label: "Delivered", at: "2026-10-10T16:35:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-102", reference: "KK-260102", customerId: "cust-001", placedAt: "2026-10-15T09:12:00+03:00",
    zone: "ilala", address: "Mtendeni St, 3rd floor", instructions: "Reception will sign",
    status: "out_for_delivery", paymentStatus: "successful", paymentMethod: "mixx", deliveryFeeTzs: 4_500,
    items: [
      { productId: "prd-005", shopId: "shop-002", productName: "Kitenge Wax Print (6 yards)", unitPriceTzs: 32_000, quantity: 3, commissionBps: 1000 },
      { productId: "prd-008", shopId: "shop-003", productName: "Men's Canvas Sneakers", unitPriceTzs: 42_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [
      { shopId: "shop-002", status: "picked_up", settlement: "not_due" },
      { shopId: "shop-003", status: "picked_up", settlement: "not_due" },
    ],
    delivery: {
      status: "IN_TRANSIT", riderId: "rider-001", riderPayoutTzs: 3_000,
      history: [
        { label: "Rider assigned", at: "2026-10-15T10:05:00+03:00", actor: "admin" },
        { label: "Rider accepted", at: "2026-10-15T10:06:00+03:00", actor: "rider" },
        { label: "Picked up from 2 shops", at: "2026-10-15T10:50:00+03:00", actor: "rider" },
        { label: "On the way", at: "2026-10-15T10:52:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-15T09:12:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-15T09:13:00+03:00", actor: "system" },
      { label: "Accepted by both shops", at: "2026-10-15T09:30:00+03:00", actor: "seller" },
      { label: "Out for delivery", at: "2026-10-15T10:52:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-103", reference: "KK-260103", customerId: "cust-001", placedAt: "2026-10-15T10:40:00+03:00",
    zone: "kinondoni", address: "Mikocheni B, near Rose Garden Rd",
    status: "placed", paymentStatus: "pending", paymentMethod: "mpesa", deliveryFeeTzs: 5_000,
    items: [
      { productId: "prd-011", shopId: "shop-004", productName: "Two-Burner Gas Stove", unitPriceTzs: 85_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-004", status: "awaiting_seller", settlement: "not_due" }],
    delivery: { status: "PENDING_ASSIGNMENT", riderPayoutTzs: 3_500, history: [] },
    history: [
      { label: "Order placed", at: "2026-10-15T10:40:00+03:00", actor: "customer" },
      { label: "Waiting for mobile money confirmation", at: "2026-10-15T10:40:00+03:00", actor: "system" },
    ],
    isDemo: true,
  },
  {
    id: "ord-104", reference: "KK-260104", customerId: "cust-002", placedAt: "2026-10-13T15:05:00+03:00",
    zone: "temeke", address: "Mbagala Kuu, opposite the dispensary",
    status: "delivered", paymentStatus: "successful", paymentMethod: "airtelmoney", deliveryFeeTzs: 6_000,
    items: [
      { productId: "prd-014", shopId: "shop-005", productName: "Kyela Rice (5kg)", unitPriceTzs: 17_500, quantity: 2, commissionBps: 700 },
      { productId: "prd-016", shopId: "shop-005", productName: "Sunflower Cooking Oil (5L)", unitPriceTzs: 29_000, quantity: 1, commissionBps: 700 },
    ],
    groups: [{ shopId: "shop-005", status: "delivered", settlement: "pending" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-002", riderPayoutTzs: 4_000,
      history: [
        { label: "Rider assigned", at: "2026-10-13T15:30:00+03:00", actor: "admin" },
        { label: "Delivered (PIN verified)", at: "2026-10-13T17:10:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-13T15:05:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-13T15:06:00+03:00", actor: "system" },
      { label: "Delivered", at: "2026-10-13T17:10:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-105", reference: "KK-260105", customerId: "cust-003", placedAt: "2026-10-15T08:20:00+03:00",
    zone: "kariakoo", address: "Lumumba St, Block C",
    status: "preparing", paymentStatus: "successful", paymentMethod: "mpesa", deliveryFeeTzs: 3_000,
    items: [
      { productId: "prd-003", shopId: "shop-001", productName: "Solar Home Kit (Panel + 3 Bulbs)", unitPriceTzs: 189_000, quantity: 1, commissionBps: 1000 },
      { productId: "prd-017", shopId: "shop-006", productName: "Cordless Drill 18V with 2 Batteries", unitPriceTzs: 145_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [
      { shopId: "shop-001", status: "preparing", settlement: "not_due" },
      { shopId: "shop-006", status: "ready_for_pickup", settlement: "not_due" },
    ],
    delivery: { status: "PENDING_ASSIGNMENT", riderPayoutTzs: 2_000, history: [] },
    history: [
      { label: "Order placed", at: "2026-10-15T08:20:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-15T08:21:00+03:00", actor: "system" },
      { label: "Accepted by both shops", at: "2026-10-15T08:45:00+03:00", actor: "seller" },
    ],
    isDemo: true,
  },
  {
    id: "ord-106", reference: "KK-260106", customerId: "cust-002", placedAt: "2026-10-15T11:02:00+03:00",
    zone: "ubungo", address: "Kimara Korogwe, near the bus stand",
    status: "confirmed", paymentStatus: "successful", paymentMethod: "mpesa", deliveryFeeTzs: 6_000,
    items: [
      { productId: "prd-010", shopId: "shop-003", productName: "Maasai Beaded Sandals", unitPriceTzs: 25_000, quantity: 2, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-003", status: "ready_for_pickup", settlement: "not_due" }],
    delivery: {
      status: "ASSIGNED", riderId: "rider-001", riderPayoutTzs: 4_000,
      history: [{ label: "Offered to rider", at: "2026-10-15T11:30:00+03:00", actor: "admin" }],
    },
    history: [
      { label: "Order placed", at: "2026-10-15T11:02:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-15T11:03:00+03:00", actor: "system" },
      { label: "Ready for pickup", at: "2026-10-15T11:25:00+03:00", actor: "seller" },
    ],
    isDemo: true,
  },
  {
    id: "ord-107", reference: "KK-260107", customerId: "cust-004", placedAt: "2026-10-12T17:45:00+03:00",
    zone: "kigamboni", address: "Kibada, near the ferry road",
    status: "cancelled", paymentStatus: "refunded", paymentMethod: "mpesa", deliveryFeeTzs: 8_000,
    items: [
      { productId: "prd-004", shopId: "shop-001", productName: "Wireless Bluetooth Earbuds", unitPriceTzs: 38_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-001", status: "rejected", settlement: "not_due", rejectionReason: "Out of stock" }],
    delivery: { status: "CANCELLED", riderPayoutTzs: 0, history: [] },
    history: [
      { label: "Order placed", at: "2026-10-12T17:45:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-12T17:46:00+03:00", actor: "system" },
      { label: "Rejected by shop: out of stock", at: "2026-10-12T18:10:00+03:00", actor: "seller" },
      { label: "Refunded in full", at: "2026-10-12T18:30:00+03:00", actor: "admin" },
    ],
    isDemo: true,
  },
  {
    id: "ord-108", reference: "KK-251208", customerId: "cust-003", placedAt: "2025-12-20T12:00:00+03:00",
    zone: "ilala", address: "Lumumba St, Block C",
    status: "delivered", paymentStatus: "successful", paymentMethod: "cod", deliveryFeeTzs: 3_500,
    items: [
      // Placed under the 12% launch rate: the snapshot keeps it forever.
      { productId: "prd-007", shopId: "shop-002", productName: "Tailored Kitenge Dress", unitPriceTzs: 70_000, quantity: 1, commissionBps: 1200 },
    ],
    groups: [{ shopId: "shop-002", status: "delivered", settlement: "settled" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-002", riderPayoutTzs: 2_500,
      history: [{ label: "Delivered, cash collected", at: "2025-12-20T15:00:00+03:00", actor: "rider" }],
    },
    history: [
      { label: "Order placed", at: "2025-12-20T12:00:00+03:00", actor: "customer" },
      { label: "Delivered", at: "2025-12-20T15:00:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-109", reference: "KK-260109", customerId: "cust-002", placedAt: "2026-10-14T13:30:00+03:00",
    zone: "kinondoni", address: "Sinza Mori, house 14",
    status: "out_for_delivery", paymentStatus: "successful", paymentMethod: "halopesa", deliveryFeeTzs: 6_000,
    items: [
      { productId: "prd-012", shopId: "shop-004", productName: "Aluminium Sufuria Set (5 pcs)", unitPriceTzs: 48_000, quantity: 1, commissionBps: 1000 },
      { productId: "prd-023", shopId: "shop-007", productName: "Men's Chronograph Watch", unitPriceTzs: 120_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [
      { shopId: "shop-004", status: "picked_up", settlement: "not_due" },
      { shopId: "shop-007", status: "picked_up", settlement: "not_due" },
    ],
    delivery: {
      status: "FAILED", riderId: "rider-002", riderPayoutTzs: 4_000,
      history: [
        { label: "Rider assigned", at: "2026-10-14T14:00:00+03:00", actor: "admin" },
        { label: "Picked up from 2 shops", at: "2026-10-14T14:45:00+03:00", actor: "rider" },
        { label: "Failed: customer unavailable", at: "2026-10-14T16:10:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-14T13:30:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-14T13:31:00+03:00", actor: "system" },
      { label: "Delivery attempt failed", at: "2026-10-14T16:10:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-110", reference: "KK-260110", customerId: "cust-003", placedAt: "2026-10-15T07:50:00+03:00",
    zone: "kariakoo", address: "Lumumba St, Block C",
    status: "delivered", paymentStatus: "successful", paymentMethod: "mpesa", deliveryFeeTzs: 2_000,
    items: [
      { productId: "prd-039", shopId: "shop-014", productName: "Pilau ya Nyama with Kachumbari", unitPriceTzs: 7_000, quantity: 2, commissionBps: 1000 },
      { productId: "prd-040", shopId: "shop-014", productName: "Chips Mayai", unitPriceTzs: 4_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-014", status: "delivered", settlement: "pending" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-001", riderPayoutTzs: 1_500,
      history: [
        { label: "Rider accepted", at: "2026-10-15T08:02:00+03:00", actor: "rider" },
        { label: "Picked up from Mama Lishe Kariakoo Kitchen", at: "2026-10-15T08:20:00+03:00", actor: "rider" },
        { label: "Delivered (PIN verified)", at: "2026-10-15T08:45:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-15T07:50:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-15T07:51:00+03:00", actor: "system" },
      { label: "Delivered", at: "2026-10-15T08:45:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-111", reference: "KK-260111", customerId: "cust-002", placedAt: "2026-10-15T11:40:00+03:00",
    zone: "ilala", address: "Bibi Titi Mohamed Rd, near the stadium",
    status: "delivered", paymentStatus: "successful", paymentMethod: "airtelmoney", deliveryFeeTzs: 3_500,
    items: [
      { productId: "prd-043", shopId: "shop-015", productName: "Men's Oxford Shirt (Long Sleeve)", unitPriceTzs: 35_000, quantity: 1, commissionBps: 1000 },
      { productId: "prd-045", shopId: "shop-015", productName: "Men's Straight Denim Jeans", unitPriceTzs: 45_000, quantity: 1, commissionBps: 1000 },
    ],
    groups: [{ shopId: "shop-015", status: "delivered", settlement: "pending" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-001", riderPayoutTzs: 2_500,
      history: [
        { label: "Rider accepted", at: "2026-10-15T11:55:00+03:00", actor: "rider" },
        { label: "Picked up from Kariakoo Mitindo Fashion House", at: "2026-10-15T12:15:00+03:00", actor: "rider" },
        { label: "Delivered (PIN verified)", at: "2026-10-15T12:50:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-15T11:40:00+03:00", actor: "customer" },
      { label: "Payment confirmed by provider", at: "2026-10-15T11:41:00+03:00", actor: "system" },
      { label: "Delivered", at: "2026-10-15T12:50:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
  {
    id: "ord-112", reference: "KK-260112", customerId: "cust-003", placedAt: "2026-10-13T10:05:00+03:00",
    zone: "kinondoni", address: "Mwenge, near the bus terminal",
    status: "delivered", paymentStatus: "successful", paymentMethod: "mpesa", deliveryFeeTzs: 5_000,
    items: [
      { productId: "prd-014", shopId: "shop-005", productName: "Kyela Rice (5kg)", unitPriceTzs: 17_500, quantity: 1, commissionBps: 700 },
    ],
    groups: [{ shopId: "shop-005", status: "delivered", settlement: "pending" }],
    delivery: {
      status: "DELIVERED", riderId: "rider-001", riderPayoutTzs: 3_500,
      history: [
        { label: "Rider accepted", at: "2026-10-13T10:20:00+03:00", actor: "rider" },
        { label: "Delivered (PIN verified)", at: "2026-10-13T11:30:00+03:00", actor: "rider" },
      ],
    },
    history: [
      { label: "Order placed", at: "2026-10-13T10:05:00+03:00", actor: "customer" },
      { label: "Delivered", at: "2026-10-13T11:30:00+03:00", actor: "rider" },
    ],
    isDemo: true,
  },
];
