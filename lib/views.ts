import type {
  Division,
  DivisionFlag,
  DivisionPnL,
  HeadcountSnapshot,
  Month,
  Recommendation,
  ResourceFlag,
  ResourceMonth,
  RiskLevel,
} from "@/lib/types";
import { classifyRisk, computeBlendedGm, computeTrend } from "@/lib/risk";
import {
  computeNonAllocatedStreak,
  computeTargetCount,
  computeUtilizationScore,
  getOptimizationPct,
  selectCandidates,
} from "@/lib/optimization";
import { getDivisionFlags, getResourceFlags } from "@/lib/flags";
import { computeRoleDemand, recommendForResource } from "@/lib/recommendations";

export type DivisionRiskRow = {
  division_id: string;
  name: string;
  gm_actual_pct: number;
  gm_forecast_pct: number;
  gm_blended: number;
  trend: number;
  risk: RiskLevel;
  opt_pct: number;
  total_headcount: number;
  target_opt_count: number;
  non_allocated_count: number;
  flags: DivisionFlag[];
  gm_actual_history: { month: Month; value: number }[];
};

export type ResourceDetailRow = {
  resource_id: string;
  role: string;
  allocation_history: { month: Month; pct: number; status: ResourceMonth["allocation_status"] }[];
  streak: number;
  utilization: number;
  recommendation: Recommendation;
  flags: ResourceFlag[];
};

export type AlertEntry = {
  division_id: string;
  division_name: string;
  text: string;
  severity: "warning" | "danger";
  resource_ids?: string[];
};

function nonAllocCountByMonth(resources: ResourceMonth[], divisionId: string): number[] {
  const months = Array.from(new Set(resources.map((r) => r.month))).sort();
  return months.map(
    (m) =>
      resources.filter(
        (r) =>
          r.division_id === divisionId &&
          r.month === m &&
          r.allocation_status === "Non-Allocated",
      ).length,
  );
}

export function buildDivisionRiskRows(
  divisions: Division[],
  pnl: DivisionPnL[],
  resources: ResourceMonth[],
  headcount: HeadcountSnapshot[],
  asOf: Month,
): DivisionRiskRow[] {
  return divisions.map((d) => {
    const pnlSorted = pnl
      .filter((p) => p.division_id === d.division_id)
      .sort((a, b) => a.month.localeCompare(b.month));
    const cur = pnlSorted.find((p) => p.month === asOf)!;
    const history = pnlSorted.slice(-3).map((p) => p.gm_actual_pct);
    const trend = computeTrend(history);
    const risk = classifyRisk(cur.gm_actual_pct, cur.gm_forecast_pct, history);
    const blended = computeBlendedGm(cur.gm_actual_pct, cur.gm_forecast_pct);
    const optPct = getOptimizationPct(risk);
    const hc = headcount.find((h) => h.division_id === d.division_id && h.month === asOf)!;
    const target = computeTargetCount(hc.total_headcount, optPct);

    const monthlyNonAlloc = nonAllocCountByMonth(resources, d.division_id);
    const nonAllocCount = resources.filter(
      (r) =>
        r.division_id === d.division_id &&
        r.month === asOf &&
        r.allocation_status === "Non-Allocated",
    ).length;

    return {
      division_id: d.division_id,
      name: d.name,
      gm_actual_pct: cur.gm_actual_pct,
      gm_forecast_pct: cur.gm_forecast_pct,
      gm_blended: Number(blended.toFixed(2)),
      trend: Number(trend.toFixed(2)),
      risk,
      opt_pct: optPct,
      total_headcount: hc.total_headcount,
      target_opt_count: target,
      non_allocated_count: nonAllocCount,
      flags: getDivisionFlags(risk, monthlyNonAlloc),
      gm_actual_history: pnlSorted.map((p) => ({ month: p.month, value: p.gm_actual_pct })),
    };
  });
}

export function buildResourceDetail(
  divisionId: string,
  resources: ResourceMonth[],
  riskByDivision: Record<string, RiskLevel>,
  asOf: Month,
): ResourceDetailRow[] {
  const inDivision = resources.filter((r) => r.division_id === divisionId);
  const window = Array.from(new Set(inDivision.map((r) => r.month))).sort().slice(-3);
  const byResource = new Map<string, ResourceMonth[]>();
  for (const r of inDivision) {
    const list = byResource.get(r.resource_id) ?? [];
    list.push(r);
    byResource.set(r.resource_id, list);
  }
  const roleDemand = computeRoleDemand(resources, riskByDivision, asOf);
  const divisionRisk = riskByDivision[divisionId];

  const rows: ResourceDetailRow[] = [];
  for (const [resource_id, list] of byResource) {
    const sorted = [...list].sort((a, b) => a.month.localeCompare(b.month));
    const role = sorted[sorted.length - 1].role;
    const streak = computeNonAllocatedStreak(sorted, asOf);
    const utilization = computeUtilizationScore(sorted, asOf);
    const allocation_history = window.map((m) => {
      const row = sorted.find((s) => s.month === m);
      return {
        month: m,
        pct: row?.allocation_percentage ?? 0,
        status: row?.allocation_status ?? "Non-Allocated",
      };
    });
    rows.push({
      resource_id,
      role,
      allocation_history,
      streak,
      utilization: Number(utilization.toFixed(1)),
      recommendation: recommendForResource(
        streak,
        utilization,
        divisionRisk,
        role,
        divisionId,
        roleDemand,
      ),
      flags: getResourceFlags(streak),
    });
  }

  rows.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.utilization - b.utilization;
  });
  return rows;
}

export function buildOptimizationTable(
  rows: DivisionRiskRow[],
  resources: ResourceMonth[],
  asOf: Month,
): {
  division_id: string;
  name: string;
  total_headcount: number;
  non_allocated_count: number;
  target_opt_count: number;
  top_action: string;
  candidates: { resource_id: string; role: string; streak: number }[];
}[] {
  return rows.map((r) => {
    const inDivision = resources.filter((res) => res.division_id === r.division_id);
    const candidates = selectCandidates(inDivision, r.target_opt_count, asOf);
    const idleCount = candidates.filter((c) => c.streak >= 2).length;
    const otherCount = candidates.length - idleCount;
    const top_action =
      candidates.length === 0
        ? "No optimization required"
        : `Optimize ${idleCount} idle, review ${otherCount} under-utilized`;
    return {
      division_id: r.division_id,
      name: r.name,
      total_headcount: r.total_headcount,
      non_allocated_count: r.non_allocated_count,
      target_opt_count: r.target_opt_count,
      top_action,
      candidates: candidates.map((c) => ({
        resource_id: c.resource_id,
        role: c.role,
        streak: c.streak,
      })),
    };
  });
}

export function buildAlerts(
  rows: DivisionRiskRow[],
  resources: ResourceMonth[],
  asOf: Month,
): AlertEntry[] {
  const out: AlertEntry[] = [];

  for (const row of rows) {
    for (const f of row.flags) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: f,
        severity: f === "Extreme risk" ? "danger" : "warning",
      });
    }
    const inDivision = resources.filter((r) => r.division_id === row.division_id);
    const byResource = new Map<string, ResourceMonth[]>();
    for (const r of inDivision) {
      const list = byResource.get(r.resource_id) ?? [];
      list.push(r);
      byResource.set(r.resource_id, list);
    }
    const idle3: string[] = [];
    const idle2: string[] = [];
    for (const [resource_id, list] of byResource) {
      const streak = computeNonAllocatedStreak(list, asOf);
      if (streak >= 3) idle3.push(resource_id);
      else if (streak >= 2) idle2.push(resource_id);
    }
    if (idle3.length > 0) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: `Idle 3+ months — high priority (${idle3.length})`,
        severity: "danger",
        resource_ids: idle3,
      });
    }
    if (idle2.length > 0) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: `Idle 2+ months (${idle2.length})`,
        severity: "warning",
        resource_ids: idle2,
      });
    }
  }
  return out;
}
