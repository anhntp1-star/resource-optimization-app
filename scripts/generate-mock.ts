import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  Month,
  ResourceMonth,
} from "../lib/types";

let SEED = 42;
function rand(): number {
  SEED = (SEED * 1664525 + 1013904223) % 4294967296;
  return SEED / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const MONTHS: Month[] = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
const ROLES = ["Senior Engineer", "Engineer", "Junior Engineer", "Project Manager", "QA"];

type Target = "Safe" | "Low" | "Medium" | "High" | "Extreme";

type Profile = {
  division_id: string;
  name: string;
  target: Target;
  headcount: number;
  // Deterministic GM trajectory: gm = base + drift * month_index + small noise
  base_actual: number;
  drift_actual: number;
  base_forecast: number;
  drift_forecast: number;
};

const PROFILES: Profile[] = [
  { division_id: "D01", name: "Cloud Services",     target: "High",    headcount: 42,
    base_actual: 8,  drift_actual: -0.6, base_forecast: 5,  drift_forecast: -0.3 },
  { division_id: "D02", name: "Data & AI",          target: "Safe",    headcount: 38,
    base_actual: 28, drift_actual: 0.3,  base_forecast: 31, drift_forecast: 0.0 },
  { division_id: "D03", name: "Enterprise Apps",    target: "Medium",  headcount: 55,
    base_actual: 10, drift_actual: 0.3,  base_forecast: 10, drift_forecast: 0.0 },
  { division_id: "D04", name: "Cybersecurity",      target: "Low",     headcount: 28,
    base_actual: 13, drift_actual: 0.5,  base_forecast: 15, drift_forecast: 0.0 },
  { division_id: "D05", name: "Legacy Maintenance", target: "Extreme", headcount: 22,
    base_actual: -1, drift_actual: -0.5, base_forecast: -3, drift_forecast: -0.5 },
];

const BENCH_RATIO: Record<Target, number> = {
  Safe: 0.05,
  Low: 0.08,
  Medium: 0.12,
  High: 0.20,
  Extreme: 0.30,
};

function genPnL(): DivisionPnL[] {
  const out: DivisionPnL[] = [];
  for (const p of PROFILES) {
    const baseRev = p.headcount * 25000;
    for (let i = 0; i < MONTHS.length; i++) {
      const month = MONTHS[i];
      // Tiny noise (+/- 0.15) so values aren't perfectly clean but stay in target bucket
      const noiseA = (rand() - 0.5) * 0.3;
      const noiseF = (rand() - 0.5) * 0.3;
      const gmActual = p.base_actual + p.drift_actual * i + noiseA;
      const gmForecast = p.base_forecast + p.drift_forecast * i + noiseF;

      const revenue = baseRev * (0.95 + rand() * 0.1);
      const cost = revenue * (1 - gmActual / 100);
      const revenueF = revenue * (1 + (rand() * 0.06 - 0.03));
      const costF = revenueF * (1 - gmForecast / 100);
      out.push({
        division_id: p.division_id,
        month,
        revenue_actual: Math.round(revenue),
        cost_actual: Math.round(cost),
        gm_actual_pct: Number(gmActual.toFixed(2)),
        revenue_forecast: Math.round(revenueF),
        cost_forecast: Math.round(costF),
        gm_forecast_pct: Number(gmForecast.toFixed(2)),
      });
    }
  }
  return out;
}

function genResourcesAndHeadcount(): {
  resources: ResourceMonth[];
  headcount: HeadcountSnapshot[];
} {
  const resources: ResourceMonth[] = [];
  const headcount: HeadcountSnapshot[] = [];

  let resourceCounter = 1;
  for (const p of PROFILES) {
    const roster: { resource_id: string; role: string }[] = [];
    for (let i = 0; i < p.headcount; i++) {
      roster.push({
        resource_id: `R${String(resourceCounter++).padStart(4, "0")}`,
        role: pick(ROLES),
      });
    }

    // Planted idle: ceil(2% of HC) or 2 minimum, always Non-Allocated all 6 months
    const plantedCount = Math.max(2, Math.ceil(p.headcount * 0.02));
    const planted = new Set(roster.slice(0, plantedCount).map((r) => r.resource_id));

    for (let mi = 0; mi < MONTHS.length; mi++) {
      const month = MONTHS[mi];
      let bench = Math.round(p.headcount * BENCH_RATIO[p.target]);
      // Force monotonically rising bench in the last 4 months for High and Extreme
      if ((p.target === "High" || p.target === "Extreme") && mi >= MONTHS.length - 4) {
        bench = bench + (mi - (MONTHS.length - 4));
      }
      bench = Math.min(bench, p.headcount);

      const nonAlloc = new Set<string>(planted);
      const candidatePool = roster.filter((r) => !planted.has(r.resource_id));
      const shuffled = [...candidatePool].sort(() => rand() - 0.5);
      for (const r of shuffled) {
        if (nonAlloc.size >= bench) break;
        nonAlloc.add(r.resource_id);
      }

      const byRole: Record<string, number> = {};
      for (const member of roster) {
        const isNon = nonAlloc.has(member.resource_id);
        const pct = isNon ? 0 : 60 + Math.floor(rand() * 41);
        resources.push({
          resource_id: member.resource_id,
          division_id: p.division_id,
          role: member.role,
          month,
          allocation_status: isNon ? "Non-Allocated" : "Allocated",
          allocation_percentage: pct,
        });
        byRole[member.role] = (byRole[member.role] ?? 0) + 1;
      }
      headcount.push({
        division_id: p.division_id,
        month,
        total_headcount: roster.length,
        by_role: byRole,
      });
    }
  }
  return { resources, headcount };
}

function main() {
  const root = resolve(process.cwd());
  const dataDir = resolve(root, "public", "data");
  mkdirSync(dataDir, { recursive: true });

  const divisions: Division[] = PROFILES.map(({ division_id, name }) => ({ division_id, name }));
  const pnl = genPnL();
  const { resources, headcount } = genResourcesAndHeadcount();

  writeFileSync(resolve(dataDir, "divisions.json"), JSON.stringify(divisions, null, 2));
  writeFileSync(resolve(dataDir, "pnl.json"), JSON.stringify(pnl, null, 2));
  writeFileSync(resolve(dataDir, "resources.json"), JSON.stringify(resources, null, 2));
  writeFileSync(resolve(dataDir, "headcount.json"), JSON.stringify(headcount, null, 2));

  console.log(`Generated:
  divisions: ${divisions.length}
  pnl rows: ${pnl.length}
  resource rows: ${resources.length}
  headcount rows: ${headcount.length}`);
}

main();
