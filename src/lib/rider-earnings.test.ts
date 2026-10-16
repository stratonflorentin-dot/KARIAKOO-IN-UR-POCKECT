import { describe, expect, it } from "vitest";
import { darDate, riderEarnings, secondsLeft, weekStart } from "./rider-earnings";

const jobs = [
  { orderId: "a", reference: "KK-1", payoutTzs: 3_500, deliveredAt: "2026-10-10T16:35:00+03:00" }, // Sat, last week
  { orderId: "b", reference: "KK-2", payoutTzs: 3_500, deliveredAt: "2026-10-13T11:30:00+03:00" }, // Tue, this week
  { orderId: "c", reference: "KK-3", payoutTzs: 1_500, deliveredAt: "2026-10-15T08:45:00+03:00" }, // today
  { orderId: "d", reference: "KK-4", payoutTzs: 2_500, deliveredAt: "2026-10-15T12:50:00+03:00" }, // today
];

describe("dates in Dar es Salaam", () => {
  it("uses local (UTC+3) dates", () => {
    expect(darDate("2026-10-14T22:30:00Z")).toBe("2026-10-15"); // 01:30 in Dar
  });

  it("finds the Monday of a week", () => {
    expect(weekStart("2026-10-15")).toBe("2026-10-12"); // Thursday → Monday
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Sunday belongs to the same week
  });
});

describe("riderEarnings", () => {
  const e = riderEarnings(jobs, "2026-10-15");

  it("totals today and this week", () => {
    expect(e.todayTzs).toBe(4_000);
    expect(e.deliveredToday).toBe(2);
    expect(e.weekTzs).toBe(7_500);
    expect(e.deliveredThisWeek).toBe(3);
  });

  it("marks last week's deliveries as paid on Monday and this week's as pending", () => {
    expect(e.paidTzs).toBe(3_500);
    expect(e.pendingTzs).toBe(7_500);
    expect(e.jobs.find((j) => j.orderId === "a")?.paid).toBe(true);
    expect(e.jobs.find((j) => j.orderId === "b")?.paid).toBe(false);
    expect(e.nextPayoutDate).toBe("2026-10-19");
  });

  it("lists newest first", () => {
    expect(e.jobs.map((j) => j.orderId)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("secondsLeft", () => {
  it("counts down and stops at zero", () => {
    expect(secondsLeft(30_000, 0)).toBe(30);
    expect(secondsLeft(30_000, 29_100)).toBe(1);
    expect(secondsLeft(30_000, 45_000)).toBe(0);
  });
});
