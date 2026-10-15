import "server-only";

// DEMO DATA: delivery PINs, readable only on the server. The customer sees
// their own PIN; the rider must enter it to complete delivery.
// In Phase 4 only a salted hash of each PIN will be stored in the database.
export const demoDeliveryPins: Record<string, string> = {
  "ord-102": "4821",
  "ord-106": "3307",
  "ord-109": "9154",
};
