import type { Month, ResourceMonth, RiskLevel } from "@/lib/types";

const OPT_PCT: Record<RiskLevel, number> = {
  Safe: 0,
  Low: 0.04,
  Medium: 0.075,
  High: 0.15,
  Extreme: 0.25,
};

export function getOptimizationPct(risk: RiskLevel): number {
  return OPT_PCT[risk];
}

export function computeTargetCount(headcount: number, optPct: number): number {
  return Math.ceil(headcount * optPct);
}

function priorMonths(asOf: Month, count: number): Month[] {
  const [y, m] = asOf.split("-").map(Number);
  const out: Month[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function computeUtilizationScore(months: ResourceMonth[], asOf: Month): number {
  const window = priorMonths(asOf, 3);
  const inWindow = months.filter((m) => window.includes(m.month));
  if (inWindow.length === 0) return 0;
  const sum = inWindow.reduce((a, m) => a + m.allocation_percentage, 0);
  return sum / inWindow.length;
}

export function computeNonAllocatedStreak(months: ResourceMonth[], asOf: Month): number {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].month > asOf) continue;
    if (sorted[i].allocation_status === "Non-Allocated") streak++;
    else break;
  }
  return streak;
}

export type Candidate = {
  resource_id: string;
  role: string;
  streak: number;
  utilization: number;
};

export function selectCandidates(
  resources: ResourceMonth[],
  targetCount: number,
  asOf: Month,
): Candidate[] {
  if (targetCount <= 0) return [];

  const byResource = new Map<string, ResourceMonth[]>();
  for (const r of resources) {
    const list = byResource.get(r.resource_id) ?? [];
    list.push(r);
    byResource.set(r.resource_id, list);
  }

  const candidates: Candidate[] = [];
  for (const [resource_id, list] of byResource) {
    const role = list[list.length - 1]?.role ?? "";
    candidates.push({
      resource_id,
      role,
      streak: computeNonAllocatedStreak(list, asOf),
      utilization: computeUtilizationScore(list, asOf),
    });
  }

  candidates.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.utilization - b.utilization;
  });

  return candidates.slice(0, targetCount);
}
