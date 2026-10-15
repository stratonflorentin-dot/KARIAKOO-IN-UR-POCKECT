import type { Customer, Rider } from "@/lib/types";

// DEMO DATA: fictional people. Phone numbers use the reserved-looking
// 0700 000 xxx pattern and must never be contacted.
export const demoCustomers: Customer[] = [
  {
    id: "cust-001", name: "Asha Mohamed", phone: "+255700000101", email: "asha.demo@example.com", status: "active", joinedAt: "2026-02-11",
    addresses: [
      { label: "Home", zone: "kinondoni", address: "Mikocheni B, near Rose Garden Rd" },
      { label: "Office", zone: "ilala", address: "Mtendeni St, 3rd floor" },
    ],
    isDemo: true,
  },
  { id: "cust-002", name: "Baraka John", phone: "+255700000102", email: "baraka.demo@example.com", status: "active", joinedAt: "2026-04-03",
    addresses: [{ label: "Home", zone: "temeke", address: "Mbagala Kuu, opposite the dispensary" }], isDemo: true },
  { id: "cust-003", name: "Neema Joseph", phone: "+255700000103", email: "neema.demo@example.com", status: "active", joinedAt: "2025-11-20",
    addresses: [{ label: "Home", zone: "kariakoo", address: "Lumumba St, Block C" }], isDemo: true },
  { id: "cust-004", name: "Juma Said", phone: "+255700000104", email: "juma.demo@example.com", status: "suspended", joinedAt: "2026-07-14",
    addresses: [{ label: "Home", zone: "kigamboni", address: "Kibada, near the ferry road" }], isDemo: true },
];

export const demoRiders: Rider[] = [
  { id: "rider-001", name: "Hamisi Ally", phone: "+255700000201", vehicle: "Boxer 150 motorcycle", plate: "MC 000 DEM", status: "approved", baseZone: "kariakoo", rating: 4.8, joinedAt: "2025-12-01", isDemo: true },
  { id: "rider-002", name: "Rehema Kassim", phone: "+255700000202", vehicle: "TVS 125 motorcycle", plate: "MC 001 DEM", status: "approved", baseZone: "temeke", rating: 4.9, joinedAt: "2026-01-19", isDemo: true },
  { id: "rider-003", name: "Peter Mushi", phone: "+255700000203", vehicle: "Bajaj RE three-wheeler", plate: "T 002 DEM", status: "pending", baseZone: "ubungo", rating: 0, joinedAt: "2026-10-12", isDemo: true },
];
