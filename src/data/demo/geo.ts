// DEMO DATA: approximate [longitude, latitude] positions in Dar es Salaam for
// the demo shops and delivery addresses. Real coordinates will come from
// sellers' verified shop locations and customers' saved addresses.
export type LngLat = [number, number];

export const shopGeo: Record<string, LngLat> = {
  "shop-001": [39.2745, -6.8185], // Msimbazi St
  "shop-002": [39.276, -6.817], // Uhuru St
  "shop-003": [39.2738, -6.8178], // Congo St
  "shop-004": [39.289, -6.815], // Samora Ave, Posta
  "shop-005": [39.277, -6.8165], // Aggrey St
  "shop-006": [39.285, -6.816], // Kisutu
  "shop-007": [39.229, -6.784], // Shekilango Rd, Sinza
  "shop-008": [39.226, -6.768], // Mwenge
  "shop-009": [39.2735, -6.8195], // Narung'ombe St
  "shop-010": [39.2755, -6.82], // Mchikichi St
  "shop-011": [39.278, -6.8172], // Uhuru St
  "shop-012": [39.278, -6.826], // Gerezani
  "shop-013": [39.227, -6.769], // Mwenge
  "shop-014": [39.2752, -6.8188], // Sikukuu St
};

export const dropoffGeo: Record<string, LngLat> = {
  "ord-101": [39.247, -6.76], // Mikocheni B
  "ord-102": [39.283, -6.8155], // Mtendeni St
  "ord-103": [39.247, -6.76],
  "ord-104": [39.263, -6.893], // Mbagala Kuu
  "ord-105": [39.279, -6.818], // Lumumba St
  "ord-106": [39.162, -6.79], // Kimara Korogwe
  "ord-107": [39.342, -6.869], // Kibada, Kigamboni
  "ord-108": [39.279, -6.818],
  "ord-109": [39.226, -6.788], // Sinza Mori
};

/** Kariakoo market, used to centre maps. */
export const KARIAKOO_CENTER: LngLat = [39.2755, -6.8185];
