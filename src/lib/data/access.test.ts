import { describe, expect, it } from "vitest";
import { AuthorizationError, demoIdentities, type Session } from "@/lib/auth/session";
import { adminData, customerOrder, customerOrders, riderDemandAreas, riderJob, riderJobs, sellerOrders, sellerProducts } from "./access";

// These tests prove the application-level isolation rules. Phase 2 adds the
// matching database tests against Supabase Row Level Security.
const customer = demoIdentities.customer; // cust-001
const otherCustomer: Session = { ...customer, userId: "u2", customerId: "cust-002" };
const seller = demoIdentities.seller; // shop-001
const otherSeller: Session = { ...seller, userId: "u3", shopId: "shop-002" };
const rider = demoIdentities.rider; // rider-001
const otherRider: Session = { ...rider, userId: "u4", riderId: "rider-002" };
const admin = demoIdentities.admin;

describe("customer isolation", () => {
  it("lists only the customer's own orders", () => {
    expect(customerOrders(customer).every((o) => o.customerId === "cust-001")).toBe(true);
    expect(customerOrders(otherCustomer).every((o) => o.customerId === "cust-002")).toBe(true);
  });

  it("cannot open another customer's order by id", () => {
    expect(customerOrder(customer, "ord-101")).not.toBeNull();
    expect(customerOrder(otherCustomer, "ord-101")).toBeNull();
  });
});

describe("seller isolation", () => {
  it("sees only orders and items for their own shop", () => {
    const views = sellerOrders(seller);
    expect(views.length).toBeGreaterThan(0);
    expect(views.every((v) => v.items.every((i) => i.shopId === "shop-001"))).toBe(true);
    // ord-105 also contains a shop-006 item, which must be hidden.
    expect(views.find((v) => v.orderId === "ord-105")?.items.map((i) => i.productId)).toEqual(["prd-003"]);
  });

  it("never sees another seller's orders or products", () => {
    expect(sellerOrders(otherSeller).some((v) => v.orderId === "ord-101")).toBe(false);
    expect(sellerProducts(otherSeller).some((p) => p.shopId === "shop-001")).toBe(false);
  });

  it("does not receive customer contact details", () => {
    const view = sellerOrders(seller)[0] as unknown as Record<string, unknown>;
    expect(JSON.stringify(view)).not.toMatch(/\+255|@example/);
  });
});

describe("rider isolation", () => {
  it("sees only deliveries assigned to them", () => {
    expect(riderJobs(rider).map((j) => j.orderId).sort()).toEqual(["ord-101", "ord-102", "ord-106", "ord-110", "ord-111", "ord-112"]);
    expect(riderJobs(otherRider).some((j) => j.orderId === "ord-102")).toBe(false);
  });

  it("cannot open another rider's delivery by id", () => {
    expect(riderJob(rider, "ord-102")).not.toBeNull();
    expect(riderJob(otherRider, "ord-102")).toBeNull();
    expect(riderJob(rider, "ord-104")).toBeNull(); // rider-002's job
  });

  it("gets customer contact details only during an active delivery", () => {
    expect(riderJob(rider, "ord-102")?.customer?.phone).toBeDefined(); // IN_TRANSIT
    expect(riderJob(rider, "ord-106")?.customer).toBeUndefined(); // only offered (ASSIGNED)
    expect(riderJob(rider, "ord-101")?.customer).toBeUndefined(); // already delivered
  });
});

describe("rider pickup details and demand", () => {
  it("lists item names and counts per pickup shop", () => {
    const job = riderJob(rider, "ord-102")!;
    expect(job.pickups.map((p) => p.items)).toEqual([[{ name: "Kitenge Wax Print (6 yards)", quantity: 3 }], [{ name: "Men's Canvas Sneakers", quantity: 1 }]]);
  });

  it("records when a delivery was completed", () => {
    expect(riderJob(rider, "ord-110")?.deliveredAt).toBe("2026-10-15T08:45:00+03:00");
    expect(riderJob(rider, "ord-102")?.deliveredAt).toBeUndefined();
  });

  it("shows busy areas as shop counts only, with no customer details", () => {
    const areas = riderDemandAreas(rider);
    expect(areas.map((a) => a.shopName).sort()).toEqual(["Jikoni Bora Supplies", "Kisutu Hardware Centre", "Msimbazi Mobile Hub"]);
    expect(JSON.stringify(areas)).not.toMatch(/\+255|@example|cust-|Lumumba|Mikocheni/);
    expect(() => riderDemandAreas(customer)).toThrow(AuthorizationError);
  });
});

describe("role checks", () => {
  it("rejects ordinary users from admin data", () => {
    for (const s of [customer, seller, rider, null]) {
      expect(() => adminData(s)).toThrow(AuthorizationError);
    }
    expect(adminData(admin).orders.length).toBeGreaterThan(0);
  });

  it("rejects calls with the wrong role or no session", () => {
    expect(() => customerOrders(seller)).toThrow(AuthorizationError);
    expect(() => sellerOrders(customer)).toThrow(AuthorizationError);
    expect(() => riderJobs(admin)).toThrow(AuthorizationError);
    expect(() => riderJobs(null)).toThrow(AuthorizationError);
  });
});
