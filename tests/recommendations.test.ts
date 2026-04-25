import { describe, it, expect } from "vitest";
import { computeRoleDemand, recommendForResource } from "@/lib/recommendations";
import type { ResourceMonth, RiskLevel } from "@/lib/types";

const r = (
  division_id: string,
  role: string,
  pct: number,
  status: "Allocated" | "Non-Allocated" = "Allocated",
  resource_id = `${division_id}-${role}-${Math.random()}`,
): ResourceMonth => ({
  resource_id,
  division_id,
  role,
  month: "2026-04",
  allocation_status: status,
  allocation_percentage: pct,
});

describe("computeRoleDemand", () => {
  it("returns roles in Safe/Low divisions with avg allocation >= 85", () => {
    const resources = [
      r("D02", "Eng", 90),
      r("D02", "Eng", 90),
      r("D03", "Eng", 40),
    ];
    const riskByDivision: Record<string, RiskLevel> = {
      D02: "Safe",
      D03: "High",
    };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toEqual(["D02"]);
  });
  it("excludes High/Extreme divisions even when saturated", () => {
    const resources = [r("D03", "Eng", 95), r("D03", "Eng", 95)];
    const riskByDivision: Record<string, RiskLevel> = { D03: "High" };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toBeUndefined();
  });
  it("excludes Safe/Low divisions when avg allocation < 85", () => {
    const resources = [r("D02", "Eng", 70), r("D02", "Eng", 70)];
    const riskByDivision: Record<string, RiskLevel> = { D02: "Safe" };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toBeUndefined();
  });
});

describe("recommendForResource", () => {
  const noDemand = new Map<string, string[]>();
  const demandForEng = new Map<string, string[]>([["Eng", ["D02"]]]);

  it("Optimize when streak >= 3 and division risk is High", () => {
    expect(recommendForResource(3, 0, "High", "Eng", "D01", noDemand)).toBe("Optimize");
  });
  it("Optimize when streak >= 3 and division risk is Extreme", () => {
    expect(recommendForResource(4, 0, "Extreme", "Eng", "D01", noDemand)).toBe("Optimize");
  });
  it("Reallocate when streak >= 1 and another division has demand for the role", () => {
    expect(recommendForResource(1, 50, "Medium", "Eng", "D01", demandForEng)).toBe(
      "Reallocate",
    );
  });
  it("does not Reallocate to the resource's own division", () => {
    const sameDivisionDemand = new Map<string, string[]>([["Eng", ["D01"]]]);
    expect(
      recommendForResource(1, 30, "Medium", "Eng", "D01", sameDivisionDemand),
    ).toBe("Upskill / Reallocate");
  });
  it("Upskill / Reallocate when utilization < 50 and no demand", () => {
    expect(recommendForResource(0, 40, "Medium", "Eng", "D01", noDemand)).toBe(
      "Upskill / Reallocate",
    );
  });
  it("Keep when none of the rules match", () => {
    expect(recommendForResource(0, 90, "Safe", "Eng", "D01", noDemand)).toBe("Keep");
  });
});
