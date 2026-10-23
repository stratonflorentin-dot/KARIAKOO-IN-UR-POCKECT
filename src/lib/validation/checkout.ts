import { z } from "zod";
import { deliveryZones } from "@/lib/delivery";

/** Tanzanian mobile numbers: 06x/07x… locally, or +255 / 255 internationally. */
export function normaliseTzPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const match = digits.match(/^(?:\+?255|0)([67]\d{8})$/);
  return match ? `+255${match[1]}` : null;
}

/** "+255712345678" → "+255 712 345 678" */
export function formatTzPhone(e164: string): string {
  const m = e164.match(/^\+255(\d{3})(\d{3})(\d{3})$/);
  return m ? `+255 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export const PAYMENT_METHODS = ["mpesa", "mixx", "airtelmoney", "halopesa", "cod"] as const;

const zoneIds = deliveryZones.map((z) => z.id) as [string, ...string[]];

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const phone = normaliseTzPhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number, e.g. 0712 345 678." });
        return z.NEVER;
      }
      return phone;
    }),
  zone: z.enum(zoneIds, { message: "Choose a delivery area." }),
  address: z.string().trim().min(5, "Enter a street, building or landmark for the rider.").max(200),
  instructions: z.string().trim().max(200, "Keep instructions under 200 characters.").optional().default(""),
  dropoffLat: z.string().optional().default("").refine((v) => Boolean(v), "Set the delivery point on the map.").refine((v) => Number.isFinite(Number(v)) && Number(v) >= -90 && Number(v) <= 90, "Choose a valid map location."),
  dropoffLng: z.string().optional().default("").refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= -180 && Number(v) <= 180), "Choose a valid map location."),
  payment: z.enum(PAYMENT_METHODS, { message: "Choose a payment method." }),
}).refine((v) => Boolean(v.dropoffLat) === Boolean(v.dropoffLng), { path: ["dropoffLat"], message: "Choose a location pin or clear it." });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
