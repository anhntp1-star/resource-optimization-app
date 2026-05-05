import { describe, it, expect } from "vitest";
import { parsePnLCsv, parseResourcesCsv } from "@/lib/parsers";

describe("parsePnLCsv", () => {
  it("parses a valid minimal CSV", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.data).toEqual([
      {
        division_id: "D01",
        division_name: "D01",
        month: "2026-04",
        gm_actual_pct: 15.2,
        gm_forecast_pct: 16.0,
        revenue_actual: 0,
        cost_actual: 0,
        revenue_forecast: 0,
        cost_forecast: 0,
      },
    ]);
  });

  it("uses division_name when present", () => {
    const csv = [
      "division_id,division_name,month,gm_actual_pct,gm_forecast_pct",
      "D01,Cloud,2026-04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data[0].division_name).toBe("Cloud");
  });

  it("captures optional revenue/cost columns when present", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct,revenue_actual,cost_actual,revenue_forecast,cost_forecast",
      "D01,2026-04,15.2,16.0,1000000,850000,1100000,924000",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data[0].revenue_actual).toBe(1000000);
    expect(r.data[0].cost_actual).toBe(850000);
  });

  it("reports missing required columns", () => {
    const csv = ["division_id,month,gm_actual_pct", "D01,2026-04,15.2"].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data).toEqual([]);
    expect(r.errors[0].message).toContain("Missing column: gm_forecast_pct");
  });

  it("reports a row with bad numeric value", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,abc,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].column).toBe("gm_actual_pct");
    expect(r.errors[0].raw).toBe("abc");
  });

  it("reports a row with malformed month", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026/04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors[0].column).toBe("month");
  });

  it("reports duplicate (division_id, month)", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,15.2,16.0",
      "D01,2026-04,14.0,15.5",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });
});

describe("parseResourcesCsv", () => {
  it("parses a valid CSV", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,80",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.data[0]).toEqual({
      resource_id: "R0001",
      division_id: "D01",
      role: "Engineer",
      month: "2026-04",
      allocation_status: "Allocated",
      allocation_percentage: 80,
    });
  });

  it("rejects invalid allocation_status", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Pending,80",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].column).toBe("allocation_status");
    expect(r.errors[0].raw).toBe("Pending");
  });

  it("rejects allocation_percentage out of range", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,150",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].column).toBe("allocation_percentage");
  });

  it("rejects duplicate (resource_id, month)", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,80",
      "R0001,D01,Engineer,2026-04,Non-Allocated,0",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("reports missing required column", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status",
      "R0001,D01,Engineer,2026-04,Allocated",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].message).toContain("Missing column: allocation_percentage");
  });
});
