import type { Month, Recommendation, ResourceMonth, RiskLevel } from "@/lib/types";

const SATURATION_THRESHOLD = 85;

export function computeRoleDemand(
  allResources: ResourceMonth[],
  riskByDivision: Record<string, RiskLevel>,
  asOf: Month,
): Map<string, string[]> {
  const buckets = new Map<
    string,
    { total: number; count: number; division_id: string; role: string }
  >();
  for (const r of allResources) {
    if (r.month !== asOf) continue;
    const key = `${r.division_id}|${r.role}`;
    const bucket =
      buckets.get(key) ?? { total: 0, count: 0, division_id: r.division_id, role: r.role };
    bucket.total += r.allocation_percentage;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const demand = new Map<string, string[]>();
  for (const { division_id, role, total, count } of buckets.values()) {
    if (count === 0) continue;
    const risk = riskByDivision[division_id];
    if (risk !== "Safe" && risk !== "Low") continue;
    if (total / count < SATURATION_THRESHOLD) continue;
    const list = demand.get(role) ?? [];
    list.push(division_id);
    demand.set(role, list);
  }
  return demand;
}

export function recommendForResource(
  streak: number,
  utilization: number,
  divisionRisk: RiskLevel,
  role: string,
  ownDivisionId: string,
  roleDemand: Map<string, string[]>,
): Recommendation {
  if (streak >= 3 && (divisionRisk === "High" || divisionRisk === "Extreme")) {
    return "Optimize";
  }
  const demandDivisions = roleDemand.get(role) ?? [];
  const externalDemand = demandDivisions.some((d) => d !== ownDivisionId);
  if (streak >= 1 && externalDemand) return "Reallocate";
  if (utilization < 50) return "Upskill / Reallocate";
  return "Keep";
}
