"use client";
import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { KpiCard } from "@/components/KpiCard";
import { GmBarChart } from "@/components/GmBarChart";
import { useDataset } from "@/lib/useDataset";
import { buildDivisionRiskRows } from "@/lib/views";

export default function Page() {
  const { dataset, isLoading } = useDataset();
  if (isLoading || !dataset) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const { divisions, pnl, resources, headcount, asOf } = dataset;
  const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);

  const totalDivisions = rows.length;
  const highPlus = rows.filter((r) => r.risk === "High" || r.risk === "Extreme").length;
  const totalTarget = rows.reduce((a, r) => a + r.target_opt_count, 0);

  const chartData = rows.map((r) => ({
    name: r.name,
    actual: r.gm_actual_pct,
    forecast: r.gm_forecast_pct,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Division Risk Dashboard</h1>
        <p className="text-sm text-slate-500">As of {asOf}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Divisions" value={totalDivisions} />
        <KpiCard label="High+ risk divisions" value={highPlus} sub={`out of ${totalDivisions}`} />
        <KpiCard label="Total target optimization HC" value={totalTarget} />
      </div>

      <GmBarChart data={chartData} />

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">GM Actual</th>
              <th className="px-3 py-2">GM Forecast</th>
              <th className="px-3 py-2">GM Blended</th>
              <th className="px-3 py-2">Trend (3mo)</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Opt %</th>
              <th className="px-3 py-2">Target Opt HC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.division_id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/resources/${r.division_id}`}
                    className="text-sky-700 hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.gm_actual_pct.toFixed(1)}%</td>
                <td className="px-3 py-2">{r.gm_forecast_pct.toFixed(1)}%</td>
                <td className="px-3 py-2">{r.gm_blended.toFixed(1)}%</td>
                <td className="px-3 py-2">
                  {r.trend > 0 ? "+" : ""}
                  {r.trend.toFixed(2)}%/mo
                </td>
                <td className="px-3 py-2">
                  <RiskBadge risk={r.risk} />
                </td>
                <td className="px-3 py-2">{(r.opt_pct * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">
                  {r.target_opt_count} / {r.total_headcount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
