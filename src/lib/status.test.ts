import { describe, expect, it } from "vitest";
import { canTransitionDelivery, canTransitionFulfillment, canTransitionPayment, isCustomerCancellable } from "./status";

describe("delivery lifecycle", () => {
  it("follows PENDING_ASSIGNMENT → ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED", () => {
    expect(canTransitionDelivery("PENDING_ASSIGNMENT", "ASSIGNED", "admin")).toBe(true);
    expect(canTransitionDelivery("ASSIGNED", "ACCEPTED", "rider")).toBe(true);
    expect(canTransitionDelivery("ACCEPTED", "PICKED_UP", "rider")).toBe(true);
    expect(canTransitionDelivery("PICKED_UP", "IN_TRANSIT", "rider")).toBe(true);
    expect(canTransitionDelivery("IN_TRANSIT", "DELIVERED", "rider")).toBe(true);
  });

  it("blocks skipped steps", () => {
    expect(canTransitionDelivery("ASSIGNED", "DELIVERED", "rider")).toBe(false);
    expect(canTransitionDelivery("ACCEPTED", "IN_TRANSIT", "rider")).toBe(false);
    expect(canTransitionDelivery("DELIVERED", "IN_TRANSIT", "admin")).toBe(false);
  });

  it("blocks the wrong role", () => {
    expect(canTransitionDelivery("PENDING_ASSIGNMENT", "ASSIGNED", "rider")).toBe(false); // riders can't self-assign
    expect(canTransitionDelivery("IN_TRANSIT", "DELIVERED", "seller")).toBe(false);
    expect(canTransitionDelivery("IN_TRANSIT", "DELIVERED", "customer")).toBe(false);
  });

  it("supports failure and re-dispatch", () => {
    expect(canTransitionDelivery("IN_TRANSIT", "FAILED", "rider")).toBe(true);
    expect(canTransitionDelivery("FAILED", "PENDING_ASSIGNMENT", "admin")).toBe(true);
    expect(canTransitionDelivery("FAILED", "PENDING_ASSIGNMENT", "rider")).toBe(false);
  });
});

describe("fulfilment", () => {
  it("lets sellers accept, prepare and mark ready", () => {
    expect(canTransitionFulfillment("awaiting_seller", "accepted", "seller")).toBe(true);
    expect(canTransitionFulfillment("accepted", "preparing", "seller")).toBe(true);
    expect(canTransitionFulfillment("preparing", "ready_for_pickup", "seller")).toBe(true);
  });

  it("never lets sellers mark goods picked up or delivered", () => {
    expect(canTransitionFulfillment("ready_for_pickup", "picked_up", "seller")).toBe(false);
    expect(canTransitionFulfillment("picked_up", "delivered", "seller")).toBe(false);
    expect(canTransitionFulfillment("picked_up", "delivered", "rider")).toBe(true);
  });
});

describe("payment", () => {
  it("only the verified provider (system) can mark a payment successful", () => {
    expect(canTransitionPayment("pending", "successful", "system")).toBe(true);
    expect(canTransitionPayment("pending", "successful", "customer")).toBe(false);
    expect(canTransitionPayment("pending", "successful", "admin")).toBe(false);
  });

  it("refunds need an admin or provider and a successful payment", () => {
    expect(canTransitionPayment("successful", "refunded", "admin")).toBe(true);
    expect(canTransitionPayment("successful", "refunded", "seller")).toBe(false);
    expect(canTransitionPayment("pending", "refunded", "admin")).toBe(false);
  });
});

describe("customer cancellation", () => {
  it("is allowed only before preparation and payment", () => {
    expect(isCustomerCancellable("placed", "pending")).toBe(true);
    expect(isCustomerCancellable("placed", "successful")).toBe(false);
    expect(isCustomerCancellable("preparing", "pending")).toBe(false);
  });
});
