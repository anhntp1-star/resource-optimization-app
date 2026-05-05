import { describe, it, expect } from "vitest";
import { computeBlendedGm, computeTrend, classifyRisk } from "@/lib/risk";

describe("computeBlendedGm", () => {
  it("weights forecast at 0.6 and actual at 0.4", () => {
    expect(computeBlendedGm(10, 20)).toBeCloseTo(16, 6);
  });
  it("returns 0 when both inputs are 0", () => {
    expect(computeBlendedGm(0, 0)).toBe(0);
  });
  it("handles negatives", () => {
    expect(computeBlendedGm(-10, -20)).toBeCloseTo(-16, 6);
  });
});

describe("computeTrend", () => {
  it("returns 0 for fewer than 3 values", () => {
    expect(computeTrend([])).toBe(0);
    expect(computeTrend([5])).toBe(0);
    expect(computeTrend([5, 6])).toBe(0);
  });
  it("returns positive slope for rising values", () => {
    expect(computeTrend([10, 12, 14])).toBeCloseTo(2, 6);
  });
  it("returns negative slope for falling values", () => {
    expect(computeTrend([14, 12, 10])).toBeCloseTo(-2, 6);
  });
  it("returns 0 for flat values", () => {
    expect(computeTrend([10, 10, 10])).toBe(0);
  });
});

describe("classifyRisk", () => {
  const flat = (v: number) => [v, v, v];

  it("Safe when blended >= 25", () => {
    expect(classifyRisk(30, 30, flat(30))).toBe("Safe");
  });
  it("Safe when blended in [18,25) and trend >= 0", () => {
    expect(classifyRisk(20, 20, flat(20))).toBe("Safe");
  });
  it("Low when blended in [18,25) and trend < 0", () => {
    expect(classifyRisk(20, 20, [22, 21, 20])).toBe("Low");
  });
  it("Low when blended in [12,18) and trend >= 0", () => {
    expect(classifyRisk(15, 15, flat(15))).toBe("Low");
  });
  it("Medium when blended in [12,18) and trend < 0", () => {
    expect(classifyRisk(15, 15, [17, 16, 15])).toBe("Medium");
  });
  it("Medium when blended in [6,12) and trend >= 0", () => {
    expect(classifyRisk(10, 10, flat(10))).toBe("Medium");
  });
  it("High when blended in [6,12) and trend < 0", () => {
    expect(classifyRisk(10, 10, [12, 11, 10])).toBe("High");
  });
  it("High when blended in [0,6) regardless of trend", () => {
    expect(classifyRisk(3, 3, flat(3))).toBe("High");
    expect(classifyRisk(3, 3, [5, 4, 3])).toBe("High");
  });
  it("Extreme when blended < 0", () => {
    expect(classifyRisk(-2, -2, flat(-2))).toBe("Extreme");
  });
});
