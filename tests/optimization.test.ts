import { describe, it, expect } from "vitest";
import {
  getOptimizationPct,
  computeTargetCount,
  computeUtilizationScore,
  computeNonAllocatedStreak,
  selectCandidates,
} from "@/lib/optimization";
import type { ResourceMonth } from "@/lib/types";

const r = (
  month: string,
  status: "Allocated" | "Non-Allocated",
  pct: number,
  id = "R1",
  role = "Eng",
): ResourceMonth => ({
  resource_id: id,
  division_id: "D01",
  role,
  month,
  allocation_status: status,
  allocation_percentage: pct,
});

describe("getOptimizationPct", () => {
  it("Safe -> 0", () => expect(getOptimizationPct("Safe")).toBe(0));
  it("Low -> 0.04", () => expect(getOptimizationPct("Low")).toBe(0.04));
  it("Medium -> 0.075", () => expect(getOptimizationPct("Medium")).toBe(0.075));
  it("High -> 0.15", () => expect(getOptimizationPct("High")).toBe(0.15));
  it("Extreme -> 0.25", () => expect(getOptimizationPct("Extreme")).toBe(0.25));
});

describe("computeTargetCount", () => {
  it("uses ceil", () => {
    expect(computeTargetCount(42, 0.15)).toBe(7);
  });
  it("returns 0 when pct is 0", () => {
    expect(computeTargetCount(42, 0)).toBe(0);
  });
});

describe("computeUtilizationScore", () => {
  it("averages allocation_percentage across the last 3 months", () => {
    const months = [
      r("2026-02", "Allocated", 100),
      r("2026-03", "Allocated", 80),
      r("2026-04", "Allocated", 60),
    ];
    expect(computeUtilizationScore(months, "2026-04")).toBeCloseTo(80, 6);
  });
  it("averages over fewer months when newer hire", () => {
    const months = [r("2026-04", "Allocated", 50)];
    expect(computeUtilizationScore(months, "2026-04")).toBe(50);
  });
  it("returns 0 when no months in window", () => {
    expect(computeUtilizationScore([], "2026-04")).toBe(0);
  });
});

describe("computeNonAllocatedStreak", () => {
  it("returns 3 when last 3 months are Non-Allocated", () => {
    const months = [
      r("2026-02", "Non-Allocated", 0),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Non-Allocated", 0),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(3);
  });
  it("returns 0 when as_of month is Allocated", () => {
    const months = [
      r("2026-02", "Non-Allocated", 0),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Allocated", 100),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(0);
  });
  it("counts only trailing consecutive Non-Allocated", () => {
    const months = [
      r("2026-01", "Non-Allocated", 0),
      r("2026-02", "Allocated", 100),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Non-Allocated", 0),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(2);
  });
});

describe("selectCandidates", () => {
  it("returns target_opt_count resources sorted by streak desc, util asc", () => {
    const resources: ResourceMonth[] = [
      r("2026-02", "Non-Allocated", 0, "R1"),
      r("2026-03", "Non-Allocated", 0, "R1"),
      r("2026-04", "Non-Allocated", 0, "R1"),
      r("2026-02", "Allocated", 100, "R2"),
      r("2026-03", "Allocated", 100, "R2"),
      r("2026-04", "Allocated", 100, "R2"),
      r("2026-02", "Allocated", 30, "R3"),
      r("2026-03", "Allocated", 30, "R3"),
      r("2026-04", "Allocated", 30, "R3"),
    ];
    const out = selectCandidates(resources, 2, "2026-04");
    expect(out.map((c) => c.resource_id)).toEqual(["R1", "R3"]);
  });
  it("returns empty array when target is 0", () => {
    expect(selectCandidates([], 0, "2026-04")).toEqual([]);
  });
});
