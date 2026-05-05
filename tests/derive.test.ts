import { describe, it, expect } from "vitest";
import { deriveDivisions, deriveHeadcount } from "@/lib/derive";
import type { DivisionPnL, ResourceMonth } from "@/lib/types";

describe("deriveDivisions", () => {
  it("returns one entry per unique division_id, using division_name when present", () => {
    const pnl: (DivisionPnL & { division_name?: string })[] = [
      {
        division_id: "D01",
        division_name: "Cloud",
        month: "2026-04",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 10,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 11,
      },
      {
        division_id: "D01",
        division_name: "Cloud",
        month: "2026-03",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 9,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 10,
      },
      {
        division_id: "D02",
        month: "2026-04",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 25,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 26,
      },
    ];
    const out = deriveDivisions(pnl);
    expect(out).toEqual([
      { division_id: "D01", name: "Cloud" },
      { division_id: "D02", name: "D02" },
    ]);
  });
});

describe("deriveHeadcount", () => {
  const r = (
    resource_id: string,
    division_id: string,
    role: string,
    month: string,
  ): ResourceMonth => ({
    resource_id,
    division_id,
    role,
    month,
    allocation_status: "Allocated",
    allocation_percentage: 100,
  });

  it("counts unique resources per division and month", () => {
    const resources = [
      r("R1", "D01", "Eng", "2026-04"),
      r("R2", "D01", "Eng", "2026-04"),
      r("R3", "D01", "PM", "2026-04"),
      r("R1", "D01", "Eng", "2026-03"),
    ];
    const out = deriveHeadcount(resources);
    const apr = out.find((h) => h.division_id === "D01" && h.month === "2026-04")!;
    expect(apr.total_headcount).toBe(3);
    expect(apr.by_role).toEqual({ Eng: 2, PM: 1 });
    const mar = out.find((h) => h.division_id === "D01" && h.month === "2026-03")!;
    expect(mar.total_headcount).toBe(1);
  });
});
