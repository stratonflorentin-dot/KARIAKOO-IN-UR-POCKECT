import {
  Baby,
  BookOpen,
  Car,
  Dumbbell,
  Pill,
  Sofa,
  UtensilsCrossed,
  CookingPot,
  Footprints,
  Scissors,
  Shirt,
  Smartphone,
  Sparkles,
  Watch,
  Wheat,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { CategorySlug } from "@/lib/types";

export const categoryIcons: Record<CategorySlug, LucideIcon> = {
  electronics: Smartphone,
  fashion: Shirt,
  shoes: Footprints,
  fabrics: Scissors,
  accessories: Watch,
  "home-kitchen": CookingPot,
  beauty: Sparkles,
  groceries: Wheat,
  hardware: Wrench,
  kids: Baby,
  pharmacy: Pill,
  stationery: BookOpen,
  sports: Dumbbell,
  "auto-parts": Car,
  furniture: Sofa,
  food: UtensilsCrossed,
};

export function CategoryIcon({ slug, ...props }: { slug: CategorySlug } & LucideProps) {
  const Icon = categoryIcons[slug];
  return <Icon aria-hidden="true" {...props} />;
}
