import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  ResourceMonth,
} from "../lib/types";
import { buildDivisionRiskRows, buildOptimizationTable } from "../lib/views";
import { selectCandidates } from "../lib/optimization";

function read<T>(name: string): T {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "data", name), "utf-8"),
  ) as T;
}

const divisions = read<Division[]>("divisions.json");
const pnl = read<DivisionPnL[]>("pnl.json");
const resources = read<ResourceMonth[]>("resources.json");
const headcount = read<HeadcountSnapshot[]>("headcount.json");
const asOf = "2026-04";

const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);

console.log("\n=== Division Risk ===");
for (const r of rows) {
  console.log(
    `${r.division_id} ${r.name.padEnd(22)} GMa=${r.gm_actual_pct.toFixed(1).padStart(5)}% ` +
      `GMf=${r.gm_forecast_pct.toFixed(1).padStart(5)}% ` +
      `blended=${r.gm_blended.toFixed(1).padStart(5)}% ` +
      `trend=${(r.trend > 0 ? "+" : "") + r.trend.toFixed(2)} → ${r.risk.padEnd(8)} ` +
      `opt=${(r.opt_pct * 100).toFixed(1)}% target=${r.target_opt_count}/${r.total_headcount} ` +
      `flags=[${r.flags.join(", ")}]`,
  );
}

console.log("\n=== Candidate-count check (must equal target_opt_count) ===");
let allGood = true;
for (const r of rows) {
  const inDivision = resources.filter((x) => x.division_id === r.division_id);
  const cands = selectCandidates(inDivision, r.target_opt_count, asOf);
  const ok = cands.length === r.target_opt_count;
  if (!ok) allGood = false;
  console.log(
    `${r.division_id}: target=${r.target_opt_count} candidates=${cands.length} ${ok ? "OK" : "MISMATCH"}`,
  );
}

console.log("\n=== Optimization table top_action ===");
const table = buildOptimizationTable(rows, resources, asOf);
for (const t of table) {
  console.log(`${t.division_id} ${t.name.padEnd(22)} ${t.top_action}`);
}

if (!allGood) {
  console.error("\nFAIL: candidate count mismatch");
  process.exit(1);
}
console.log("\nAll acceptance checks PASSED");
