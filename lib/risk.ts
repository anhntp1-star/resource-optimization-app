import type { RiskLevel } from "@/lib/types";

export function computeBlendedGm(gmActualPct: number, gmForecastPct: number): number {
  return 0.4 * gmActualPct + 0.6 * gmForecastPct;
}

export function computeTrend(values: number[]): number {
  if (values.length < 3) return 0;
  const n = values.length;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function classifyRisk(
  gmActualPct: number,
  gmForecastPct: number,
  gmActualHistory: number[],
): RiskLevel {
  const blended = computeBlendedGm(gmActualPct, gmForecastPct);
  const trend = computeTrend(gmActualHistory);

  if (blended < 0) return "Extreme";
  if (blended < 6) return "High";
  if (blended < 12) return trend < 0 ? "High" : "Medium";
  if (blended < 18) return trend < 0 ? "Medium" : "Low";
  if (blended < 25) return trend < 0 ? "Low" : "Safe";
  return "Safe";
}
