// Departments (who a product is for) and clothing/fashion product types.
// Unisex products appear in both the Men and Women departments.
import type { Audience, CategorySlug, ProductType } from "@/lib/types";

export const audiences: { id: Audience; label: string; labelSw: string }[] = [
  { id: "men", label: "Men", labelSw: "Wanaume" },
  { id: "women", label: "Women", labelSw: "Wanawake" },
  { id: "kids", label: "Kids", labelSw: "Watoto" },
  { id: "unisex", label: "Unisex", labelSw: "Wote" },
];

/** Departments shown in navigation (unisex is folded into men and women). */
export const departments = audiences.filter((a) => a.id !== "unisex");

export const productTypes: { id: ProductType; label: string; for: Audience[] }[] = [
  { id: "shirts", label: "Shirts", for: ["men", "women", "kids"] },
  { id: "t-shirts", label: "T-shirts & polos", for: ["men", "women", "kids", "unisex"] },
  { id: "blouses", label: "Blouses & tops", for: ["women"] },
  { id: "trousers", label: "Trousers", for: ["men", "women", "kids"] },
  { id: "jeans", label: "Jeans", for: ["men", "women", "unisex"] },
  { id: "shorts", label: "Shorts", for: ["men", "women", "kids"] },
  { id: "dresses", label: "Dresses", for: ["women", "kids"] },
  { id: "skirts", label: "Skirts", for: ["women", "kids"] },
  { id: "suits", label: "Suits & blazers", for: ["men", "women"] },
  { id: "jackets", label: "Jackets", for: ["men", "women", "kids", "unisex"] },
  { id: "traditional", label: "Traditional wear", for: ["men", "women", "kids", "unisex"] },
  { id: "sneakers", label: "Sneakers", for: ["men", "women", "kids", "unisex"] },
  { id: "formal-shoes", label: "Formal shoes", for: ["men", "women"] },
  { id: "sandals", label: "Sandals", for: ["men", "women", "kids", "unisex"] },
  { id: "school-shoes", label: "School shoes", for: ["kids"] },
  { id: "bags", label: "Bags", for: ["men", "women", "unisex"] },
  { id: "watches", label: "Watches", for: ["men", "women", "unisex"] },
  { id: "sunglasses", label: "Sunglasses", for: ["men", "women", "unisex"] },
  { id: "jewellery", label: "Jewellery", for: ["men", "women"] },
];

/** Categories where "who is it for" and "type" apply. */
export const apparelCategories: CategorySlug[] = ["fashion", "shoes", "accessories", "kids", "fabrics"];

export function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && audiences.some((a) => a.id === v);
}

export function isProductType(v: unknown): v is ProductType {
  return typeof v === "string" && productTypes.some((t) => t.id === v);
}

export function audienceLabel(a: Audience): string {
  return audiences.find((x) => x.id === a)?.label ?? a;
}

export function productTypeLabel(t: ProductType): string {
  return productTypes.find((x) => x.id === t)?.label ?? t;
}

/** Does a product for `productAudience` belong in the `department` view? */
export function inDepartment(productAudience: Audience | undefined, department: Audience): boolean {
  if (!productAudience) return false;
  if (productAudience === department) return true;
  return productAudience === "unisex" && (department === "men" || department === "women");
}

export function typesForDepartment(department: Audience) {
  return productTypes.filter((t) => t.for.includes(department) || (department !== "kids" && t.for.includes("unisex")));
}
