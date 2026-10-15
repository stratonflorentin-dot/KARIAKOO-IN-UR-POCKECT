import type { CommissionRule } from "@/lib/types";

// DEMO DATA: commission rule history. Rules are never edited in place: a new
// rate is a new row with a future effective date, so past orders keep the
// rate that applied when they were placed.
export const demoCommissionRules: CommissionRule[] = [
  { id: "cr-001", scope: "default", rateBps: 1200, effectiveFrom: "2025-01-01T00:00:00+03:00", note: "Launch rate", createdBy: "Founder (demo)" },
  { id: "cr-002", scope: "default", rateBps: 1000, effectiveFrom: "2026-01-01T00:00:00+03:00", note: "Standard platform rate", createdBy: "Founder (demo)" },
  { id: "cr-003", scope: "shop", target: "shop-005", rateBps: 700, effectiveFrom: "2026-06-01T00:00:00+03:00", note: "High-volume grocery partner", createdBy: "Founder (demo)" },
  { id: "cr-004", scope: "category", target: "electronics", rateBps: 800, effectiveFrom: "2026-11-01T00:00:00+03:00", note: "Scheduled: lower electronics rate", createdBy: "Founder (demo)" },
];
