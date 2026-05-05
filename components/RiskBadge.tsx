import type { RiskLevel } from "@/lib/types";

const STYLES: Record<RiskLevel, string> = {
  Safe: "bg-emerald-100 text-emerald-800",
  Low: "bg-lime-100 text-lime-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Extreme: "bg-red-100 text-red-800",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[risk]}`}
    >
      {risk}
    </span>
  );
}
