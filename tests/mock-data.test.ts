import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  ResourceMonth,
} from "@/lib/types";
import { classifyRisk } from "@/lib/risk";

const root = resolve(__dirname, "..");
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(root, "data", name), "utf-8")) as T;

describe("mock data", () => {
  const divisions = read<Division[]>("divisions.json");
  const pnl = read<DivisionPnL[]>("pnl.json");
  const resources = read<ResourceMonth[]>("resources.json");
  const headcount = read<HeadcountSnapshot[]>("headcount.json");

  it("has 5 divisions", () => {
    expect(divisions).toHaveLength(5);
  });

  it("has 6 months of PnL per division", () => {
    expect(pnl).toHaveLength(30);
  });

  it("has headcount snapshots matching division x month grid", () => {
    expect(headcount).toHaveLength(30);
  });

  it("has resource rows that mention every division", () => {
    const ids = new Set(resources.map((r) => r.division_id));
    expect(ids).toEqual(new Set(divisions.map((d) => d.division_id)));
  });

  it("covers all 5 risk levels at as_of_month=2026-04", () => {
    const asOf = "2026-04";
    const risks = new Set<string>();
    for (const d of divisions) {
      const history = pnl
        .filter((p) => p.division_id === d.division_id)
        .sort((a, b) => a.month.localeCompare(b.month));
      const cur = history.find((h) => h.month === asOf)!;
      const last3Actuals = history.slice(-3).map((h) => h.gm_actual_pct);
      risks.add(classifyRisk(cur.gm_actual_pct, cur.gm_forecast_pct, last3Actuals));
    }
    expect(risks).toEqual(new Set(["Safe", "Low", "Medium", "High", "Extreme"]));
  });
});
