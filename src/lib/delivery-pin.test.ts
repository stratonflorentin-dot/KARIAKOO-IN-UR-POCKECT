import { beforeEach, describe, expect, it } from "vitest";
import { AuthorizationError, demoIdentities, type Session } from "@/lib/auth/session";
import { deliveryPinForCustomer, MAX_PIN_ATTEMPTS, resetPinAttempts, verifyDeliveryPin } from "./delivery-pin";

const rider = demoIdentities.rider; // rider-001, assigned to ord-102 (IN_TRANSIT, PIN 4821)
const otherRider: Session = { ...rider, riderId: "rider-002" };

describe("delivery PIN", () => {
  beforeEach(() => resetPinAttempts());

  it("accepts the correct PIN from the assigned rider", () => {
    expect(verifyDeliveryPin(rider, "ord-102", "4821")).toEqual({ ok: true });
  });

  it("rejects a wrong PIN and counts attempts", () => {
    expect(verifyDeliveryPin(rider, "ord-102", "0000")).toEqual({ ok: false, reason: "incorrect", attemptsLeft: MAX_PIN_ATTEMPTS - 1 });
  });

  it("locks after too many wrong attempts, even if the right PIN follows", () => {
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) verifyDeliveryPin(rider, "ord-102", "1111");
    expect(verifyDeliveryPin(rider, "ord-102", "4821")).toEqual({ ok: false, reason: "locked" });
  });

  it("rejects badly formatted PINs", () => {
    expect(verifyDeliveryPin(rider, "ord-102", "48a1")).toMatchObject({ reason: "invalid_format" });
    expect(verifyDeliveryPin(rider, "ord-102", 4821)).toMatchObject({ reason: "invalid_format" });
  });

  it("refuses riders who are not assigned, without revealing the order exists", () => {
    expect(verifyDeliveryPin(otherRider, "ord-102", "4821")).toEqual({ ok: false, reason: "not_found" });
    expect(verifyDeliveryPin(rider, "does-not-exist", "4821")).toEqual({ ok: false, reason: "not_found" });
  });

  it("refuses deliveries that are not in transit", () => {
    expect(verifyDeliveryPin(rider, "ord-106", "3307")).toMatchObject({ reason: "wrong_status" });
  });

  it("refuses non-riders", () => {
    expect(() => verifyDeliveryPin(demoIdentities.seller, "ord-102", "4821")).toThrow(AuthorizationError);
  });

  it("shows the PIN only to the order's customer", () => {
    expect(deliveryPinForCustomer(demoIdentities.customer, "ord-102")).toBe("4821");
    expect(deliveryPinForCustomer({ ...demoIdentities.customer, customerId: "cust-002" }, "ord-102")).toBeNull();
  });
});
