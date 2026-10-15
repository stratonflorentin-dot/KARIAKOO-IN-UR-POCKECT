import { describe, expect, it } from "vitest";
import { checkoutSchema, formatTzPhone, normaliseTzPhone } from "./checkout";

const valid = { name: "Asha Mohamed", phone: "0712 345 678", zone: "ilala", address: "Mtendeni St, 3rd floor", payment: "mpesa" };

describe("Tanzanian phone numbers", () => {
  it.each(["0712345678", "0712 345 678", "+255712345678", "255 712-345-678", "0622345678"])("accepts %s", (n) => {
    expect(normaliseTzPhone(n)).toMatch(/^\+255[67]\d{8}$/);
  });
  it.each(["12345", "0812345678", "+254712345678", "07123456789"])("rejects %s", (n) => {
    expect(normaliseTzPhone(n)).toBeNull();
  });
  it("formats for display", () => {
    expect(formatTzPhone("+255712345678")).toBe("+255 712 345 678");
  });
});

describe("checkoutSchema", () => {
  it("accepts valid input and normalises the phone", () => {
    const r = checkoutSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.phone).toBe("+255712345678");
  });

  it("reports a clear message for each invalid field", () => {
    const r = checkoutSchema.safeParse({ name: "A", phone: "123", zone: "mars", address: "x", payment: "bitcoin" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields.sort()).toEqual(["address", "name", "payment", "phone", "zone"]);
  });

  it("ignores extra fields such as prices", () => {
    const r = checkoutSchema.safeParse({ ...valid, totalTzs: 1, priceTzs: 1 });
    expect(r.success && "totalTzs" in r.data).toBe(false);
  });
});
