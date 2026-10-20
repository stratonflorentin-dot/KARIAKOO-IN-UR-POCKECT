import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const promotionDraftSchema = z.object({
  kind: z.enum(["status", "teaser", "branding"]),
  title: optionalText(120),
  body: optionalText(600),
  imageUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().max(2048, "Keep the image URL under 2,048 characters.").url("Enter a valid image URL.").refine((value) => value.startsWith("https://"), "Image URLs must use HTTPS.").optional(),
  ),
  linkProductId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().uuid("Choose one of your products.").optional(),
  ),
  expiresIn: z.enum(["1day", "3days", "7days", "always"]),
}).refine((value) => Boolean(value.title || value.body || value.imageUrl), {
  message: "Add a title, message, or image.",
}).refine((value) => value.expiresIn !== "always" || value.kind === "branding", {
  message: "Only a shop introduction can stay visible until you remove it.",
});

export type PromotionDraft = z.infer<typeof promotionDraftSchema>;
