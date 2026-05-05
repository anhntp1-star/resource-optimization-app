import { describe, it, expect } from "vitest";
import { getResourceFlags, getDivisionFlags } from "@/lib/flags";

describe("getResourceFlags", () => {
  it("returns empty for streak < 2", () => {
    expect(getResourceFlags(0)).toEqual([]);
    expect(getResourceFlags(1)).toEqual([]);
  });
  it("returns 'Idle 2+ months' for streak == 2", () => {
    expect(getResourceFlags(2)).toEqual(["Idle 2+ months"]);
  });
  it("returns only the high-priority flag for streak >= 3", () => {
    expect(getResourceFlags(3)).toEqual(["Idle 3+ months — high priority"]);
    expect(getResourceFlags(5)).toEqual(["Idle 3+ months — high priority"]);
  });
});

describe("getDivisionFlags", () => {
  it("flags 'Rising bench' when non-allocated count strictly increased in each of last 3 months", () => {
    expect(getDivisionFlags("Low", [2, 5, 7, 10])).toContain("Rising bench");
  });
  it("does not flag 'Rising bench' when sequence is flat", () => {
    expect(getDivisionFlags("Low", [5, 5, 5, 5])).not.toContain("Rising bench");
  });
  it("does not flag 'Rising bench' when only 2 months provided", () => {
    expect(getDivisionFlags("Low", [3, 5])).not.toContain("Rising bench");
  });
  it("flags 'Extreme risk' when risk is Extreme", () => {
    expect(getDivisionFlags("Extreme", [1, 1, 1, 1])).toContain("Extreme risk");
  });
  it("returns empty for Safe risk with stable bench", () => {
    expect(getDivisionFlags("Safe", [2, 2, 2, 2])).toEqual([]);
  });
});
