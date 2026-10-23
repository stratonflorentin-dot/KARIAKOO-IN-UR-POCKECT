import { describe, expect, it } from "vitest";
import { applyPaymentEvent, canTransitionPayment, paymentEventTarget, type PaymentStatus } from "./status";

describe("payment status state machine", () => {
  it("maps events to their target status", () => {
    expect(paymentEventTarget("initiated")).toBe("pending");
    expect(paymentEventTarget("succeeded")).toBe("successful");
    expect(paymentEventTarget("cod_collected")).toBe("successful");
    expect(paymentEventTarget("failed")).toBe("failed");
    expect(paymentEventTarget("refunded")).toBe("refunded");
  });

  it("allows the real-world transitions", () => {
    expect(canTransitionPayment("pending", "successful")).toBe(true);
    expect(canTransitionPayment("pending", "failed")).toBe(true);
    expect(canTransitionPayment("failed", "pending")).toBe(true); // retry
    expect(canTransitionPayment("failed", "successful")).toBe(true);
    expect(canTransitionPayment("successful", "refunded")).toBe(true);
  });

  it("refuses impossible transitions", () => {
    expect(canTransitionPayment("refunded", "successful")).toBe(false);
    expect(canTransitionPayment("refunded", "pending")).toBe(false);
    expect(canTransitionPayment("successful", "failed")).toBe(false);
    expect(canTransitionPayment("successful", "pending")).toBe(false);
  });

  it("never lets a refund be undone", () => {
    const statuses: PaymentStatus[] = ["pending", "successful", "failed"];
    for (const to of statuses) {
      expect(canTransitionPayment("refunded", to)).toBe(false);
    }
  });

  it("reports a reason when an event is not permitted", () => {
    const refundThenSucceed = applyPaymentEvent("refunded", "succeeded");
    expect(refundThenSucceed.ok).toBe(false);
    expect(refundThenSucceed.to).toBe("refunded");
    expect(refundThenSucceed.reason).toMatch(/not allowed/);

    const ok = applyPaymentEvent("pending", "succeeded");
    expect(ok).toEqual({ ok: true, to: "successful" });
  });
});
