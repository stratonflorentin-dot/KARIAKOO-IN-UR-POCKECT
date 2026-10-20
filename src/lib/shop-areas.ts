import type { ShopArea } from "@/lib/types";

// Dar es Salaam trading areas offered on the seller application. Kept in a
// plain module (not the "use server" actions file, which may only export async
// functions) so both the client form and the server action can import it.
export const SHOP_AREAS: { id: ShopArea; label: string }[] = [
  { id: "kariakoo", label: "Kariakoo" },
  { id: "posta", label: "Posta / City Centre" },
  { id: "sinza", label: "Sinza" },
  { id: "mwenge", label: "Mwenge" },
];
