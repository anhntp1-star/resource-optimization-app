"use client";
import { useDataset } from "@/lib/useDataset";
import { buildAlerts, buildDivisionRiskRows } from "@/lib/views";

export default function AlertsPage() {
  const { dataset, isLoading } = useDataset();
  if (isLoading || !dataset) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const { divisions, pnl, resources, headcount, asOf } = dataset;
  const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);
  const alerts = buildAlerts(rows, resources, asOf);

  const byDivision = new Map<string, typeof alerts>();
  for (const a of alerts) {
    const list = byDivision.get(a.division_id) ?? [];
    list.push(a);
    byDivision.set(a.division_id, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts</h1>
      {alerts.length === 0 && <p className="text-sm text-slate-500">No alerts.</p>}
      {[...byDivision.entries()].map(([divisionId, list]) => (
        <div key={divisionId} className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-semibold">{list[0].division_name}</h2>
          <ul className="space-y-2">
            {list.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`inline-block h-2 w-2 translate-y-1.5 rounded-full ${
                    a.severity === "danger" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                <div>
                  <div>{a.text}</div>
                  {a.resource_ids && a.resource_ids.length > 0 && (
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {a.resource_ids.slice(0, 6).join(", ")}
                      {a.resource_ids.length > 6 && ` +${a.resource_ids.length - 6} more`}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
