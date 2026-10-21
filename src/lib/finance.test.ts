import { describe, expect, it } from "vitest";
import {
  detectProvider,
  formatTin,
  formatTzMsisdn,
  isValidTzMobile,
  normalizeTin,
  normalizeTzMsisdn,
  vatBreakdown,
} from "./finance";

describe("vatBreakdown", () => {
  it("backs 18% VAT out of a VAT-inclusive amount", () => {
    const b = vatBreakdown(11800);
    expect(b.netTzs).toBe(10000);
    expect(b.vatTzs).toBe(1800);
    expect(b.netTzs + b.vatTzs).toBe(b.grossTzs);
  });

  it("always reconciles net + vat to gross (rounding)", () => {
    for (const gross of [0, 1, 999, 4000, 68000, 123457]) {
      const b = vatBreakdown(gross);
      expect(b.netTzs + b.vatTzs).toBe(gross);
    }
  });
});

describe("Tanzanian mobile numbers", () => {
  it("normalizes the various forms to 9 national digits", () => {
    expect(normalizeTzMsisdn("0742123456")).toBe("742123456");
    expect(normalizeTzMsisdn("+255 742 123 456")).toBe("742123456");
    expect(normalizeTzMsisdn("255742123456")).toBe("742123456");
    expect(normalizeTzMsisdn("742123456")).toBe("742123456");
  });

  it("rejects numbers that are not TZ mobiles", () => {
    expect(normalizeTzMsisdn("12345")).toBeNull();
    expect(normalizeTzMsisdn("0222123456")).toBeNull(); // landline (starts 2)
    expect(isValidTzMobile("not a number")).toBe(false);
    expect(isValidTzMobile("0754000111")).toBe(true);
  });

  it("formats for display", () => {
    expect(formatTzMsisdn("255742123456")).toBe("0742 123 456");
  });

  it("detects the mobile-money network from the prefix", () => {
    expect(detectProvider("0754000111")?.id).toBe("mpesa");
    expect(detectProvider("0712000111")?.id).toBe("mixx");
    expect(detectProvider("0782000111")?.id).toBe("airtelmoney");
    expect(detectProvider("0620000111")?.id).toBe("halopesa");
    expect(detectProvider("0990000111")).toBeNull();
  });
});

describe("TIN", () => {
  it("accepts 9 digits and formats them", () => {
    expect(normalizeTin("123456789")).toBe("123456789");
    expect(formatTin("123456789")).toBe("123-456-789");
    expect(normalizeTin("1234")).toBeNull();
  });
});
