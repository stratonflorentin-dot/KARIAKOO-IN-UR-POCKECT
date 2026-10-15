// Shared domain types. They mirror the database tables planned for Phase 2,
// so moving from demo data to Supabase changes the data-access layer only.
//
// MONEY: every amount is an integer number of Tanzanian shillings (TZS).
// TZS coins below 1 shilling are not used in practice, so whole shillings
// are our exact "minor unit". Never store or compute money as fractions.

export type Role = "customer" | "seller" | "rider" | "admin";

export type CategorySlug =
  | "electronics"
  | "fashion"
  | "shoes"
  | "fabrics"
  | "home-kitchen"
  | "accessories"
  | "beauty"
  | "groceries"
  | "hardware"
  | "kids"
  | "pharmacy"
  | "stationery"
  | "sports"
  | "auto-parts"
  | "furniture"
  | "food";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Kiswahili name shown as a secondary label. */
  nameSw: string;
}

export type ShopStatus = "pending" | "approved" | "rejected" | "suspended";

/** Dar es Salaam trading areas used for search filtering. */
export type ShopArea = "kariakoo" | "posta" | "sinza" | "mwenge";

export interface Shop {
  id: string;
  slug: string;
  name: string;
  area: ShopArea;
  /** Street / landmark. */
  address: string;
  description: string;
  categories: CategorySlug[];
  rating: number;
  reviewCount: number;
  verified: boolean;
  status: ShopStatus;
  openingHours: string;
  joinedYear: number;
  isDemo: true;
}

export type ProductStatus = "active" | "archived";

export interface Product {
  id: string;
  slug: string;
  name: string;
  shopId: string;
  category: CategorySlug;
  priceTzs: number;
  /** Optional "was" price for offers. */
  compareAtTzs?: number;
  stock: number;
  unit: string;
  description: string;
  highlights: string[];
  status: ProductStatus;
  /** Units sold to date (demo), used for "popular" sorting. */
  soldCount: number;
  /** Display name of the shop (filled in by the catalog). */
  shopName?: string;
  /** ISO date the product was listed, used for "newest" sorting. */
  listedAt: string;
  isDemo: true;
}

/* ---------------- Orders, payments and delivery ---------------- */

/** Customer-facing overall order status. */
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/** Payment status is tracked separately from fulfilment. */
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

/** Each shop in an order gets its own fulfilment group. */
export type FulfillmentStatus =
  | "awaiting_seller"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type DeliveryStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

/** Settlement to sellers is tracked separately from customer payment. */
export type SettlementStatus = "not_due" | "pending" | "settled";

export type PaymentMethod = "mpesa" | "mixx" | "airtelmoney" | "halopesa" | "cod";

export interface OrderItem {
  productId: string;
  shopId: string;
  /** Snapshot of the name at order time. */
  productName: string;
  /** Immutable price snapshot at order time. */
  unitPriceTzs: number;
  quantity: number;
  /** Commission rate applied when the order was placed, in basis points (1000 = 10%). */
  commissionBps: number;
}

export interface FulfillmentGroup {
  shopId: string;
  status: FulfillmentStatus;
  settlement: SettlementStatus;
  rejectionReason?: string;
}

export interface StatusEvent {
  label: string;
  at: string;
  actor: "customer" | "seller" | "rider" | "admin" | "system";
}

export interface Delivery {
  status: DeliveryStatus;
  riderId?: string;
  /** What the rider is paid for this job, in TZS. */
  riderPayoutTzs: number;
  history: StatusEvent[];
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  placedAt: string;
  zone: DeliveryZoneId;
  address: string;
  instructions?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryFeeTzs: number;
  items: OrderItem[];
  groups: FulfillmentGroup[];
  delivery: Delivery;
  history: StatusEvent[];
  isDemo: true;
}

/* ---------------- People ---------------- */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "suspended";
  joinedAt: string;
  addresses: { label: string; zone: DeliveryZoneId; address: string }[];
  isDemo: true;
}

export type RiderStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: RiderStatus;
  baseZone: DeliveryZoneId;
  rating: number;
  joinedAt: string;
  isDemo: true;
}

/* ---------------- Commission ---------------- */

export interface CommissionRule {
  id: string;
  scope: "default" | "category" | "shop";
  /** Category slug or shop id, depending on scope. */
  target?: string;
  rateBps: number;
  effectiveFrom: string;
  note: string;
  createdBy: string;
}

/* ---------------- Delivery zones ---------------- */

export type DeliveryZoneId =
  | "kariakoo"
  | "ilala"
  | "kinondoni"
  | "temeke"
  | "ubungo"
  | "kigamboni";

export interface DeliveryZone {
  id: DeliveryZoneId;
  name: string;
  etaLabel: string;
  feeTzs: number;
}

/** What the browser is allowed to store and send: ids and quantities only. */
export interface CartLine {
  productId: string;
  quantity: number;
}
