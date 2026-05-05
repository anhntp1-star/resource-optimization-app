import type { DivisionFlag, ResourceFlag, RiskLevel } from "@/lib/types";

export function getResourceFlags(streak: number): ResourceFlag[] {
  if (streak >= 3) return ["Idle 3+ months — high priority"];
  if (streak >= 2) return ["Idle 2+ months"];
  return [];
}

export function getDivisionFlags(
  risk: RiskLevel,
  monthlyNonAllocCounts: number[],
): DivisionFlag[] {
  const flags: DivisionFlag[] = [];
  if (monthlyNonAllocCounts.length >= 4) {
    const tail = monthlyNonAllocCounts.slice(-4);
    const rising = tail[1] > tail[0] && tail[2] > tail[1] && tail[3] > tail[2];
    if (rising) flags.push("Rising bench");
  }
  if (risk === "Extreme") flags.push("Extreme risk");
  return flags;
}
