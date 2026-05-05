import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPnL,
  setPnL,
  getResources,
  setResources,
  hasCustomData,
  clearAll,
  DATASET_CHANGED_EVENT,
} from "@/lib/store";
import type { DivisionPnL, ResourceMonth } from "@/lib/types";

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => void map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeMemoryStorage());
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});

const samplePnL: DivisionPnL[] = [
  {
    division_id: "D01",
    month: "2026-04",
    revenue_actual: 100,
    cost_actual: 90,
    gm_actual_pct: 10,
    revenue_forecast: 100,
    cost_forecast: 90,
    gm_forecast_pct: 10,
  },
];

const sampleResources: ResourceMonth[] = [
  {
    resource_id: "R1",
    division_id: "D01",
    role: "Eng",
    month: "2026-04",
    allocation_status: "Allocated",
    allocation_percentage: 80,
  },
];

describe("store", () => {
  it("returns null before any set", () => {
    expect(getPnL()).toBeNull();
    expect(getResources()).toBeNull();
    expect(hasCustomData()).toBe(false);
  });

  it("round-trips PnL data", () => {
    setPnL(samplePnL);
    expect(getPnL()).toEqual(samplePnL);
    expect(hasCustomData()).toBe(true);
  });

  it("round-trips Resources data", () => {
    setResources(sampleResources);
    expect(getResources()).toEqual(sampleResources);
  });

  it("clearAll removes both", () => {
    setPnL(samplePnL);
    setResources(sampleResources);
    clearAll();
    expect(getPnL()).toBeNull();
    expect(getResources()).toBeNull();
    expect(hasCustomData()).toBe(false);
  });

  it("setPnL dispatches dataset-changed event", () => {
    setPnL(samplePnL);
    expect(window.dispatchEvent).toHaveBeenCalled();
    const evt = (window.dispatchEvent as unknown as { mock: { calls: Event[][] } }).mock.calls[0][0];
    expect(evt.type).toBe(DATASET_CHANGED_EVENT);
  });
});
