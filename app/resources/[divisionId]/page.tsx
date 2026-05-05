"use client";
import { useParams } from "next/navigation";
import { RiskBadge } from "@/components/RiskBadge";
import { AllocationSparkline } from "@/components/AllocationSparkline";
import { useDataset } from "@/lib/useDataset";
import { buildDivisionRiskRows, buildResourceDetail } from "@/lib/views";

export default function ResourceDetail() {
  const params = useParams<{ divisionId: string }>();
  const divisionId = params.divisionId;
  const { dataset, isLoading } = useDataset();

  if (isLoading || !dataset) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const { divisions, pnl, resources, headcount, asOf } = dataset;
  const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);
  const row = rows.find((r) => r.division_id === divisionId);
  if (!row) {
    return <div className="text-sm text-slate-500">Division not found.</div>;
  }
  const riskByDivision = Object.fromEntries(rows.map((r) => [r.division_id, r.risk]));
  const detail = buildResourceDetail(divisionId, resources, riskByDivision, asOf);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{row.name}</h1>
        <div className="mt-1 flex gap-3 text-sm text-slate-600">
          <RiskBadge risk={row.risk} />
          <span>Opt {(row.opt_pct * 100).toFixed(1)}%</span>
          <span>
            Target {row.target_opt_count} / {row.total_headcount}
          </span>
          <span>As of {asOf}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">3-mo allocation</th>
              <th className="px-3 py-2">Streak</th>
              <th className="px-3 py-2">Avg util</th>
              <th className="px-3 py-2">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((d) => (
              <tr key={d.resource_id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{d.resource_id}</td>
                <td className="px-3 py-2">{d.role}</td>
                <td className="px-3 py-2">
                  <AllocationSparkline values={d.allocation_history.map((h) => h.pct)} />
                </td>
                <td className="px-3 py-2">{d.streak}</td>
                <td className="px-3 py-2">{d.utilization.toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <RecommendationLabel rec={d.recommendation} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecommendationLabel({ rec }: { rec: string }) {
  const colors: Record<string, string> = {
    Keep: "text-slate-600",
    Reallocate: "text-sky-700",
    "Upskill / Reallocate": "text-amber-700",
    Optimize: "text-red-700",
  };
  return <span className={`font-medium ${colors[rec] ?? ""}`}>{rec}</span>;
}
