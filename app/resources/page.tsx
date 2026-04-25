import Link from "next/link";
import {
  loadDivisions,
  loadHeadcount,
  loadPnL,
  loadResources,
  getAsOfMonth,
} from "@/lib/data";
import { buildDivisionRiskRows, buildOptimizationTable } from "@/lib/views";

export default function ResourcesIndex() {
  const divisions = loadDivisions();
  const pnl = loadPnL();
  const resources = loadResources();
  const headcount = loadHeadcount();
  const asOf = getAsOfMonth(pnl);
  const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);
  const table = buildOptimizationTable(rows, resources, asOf);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resource Optimization</h1>
      <p className="text-sm text-slate-500">As of {asOf}</p>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">Total HC</th>
              <th className="px-3 py-2">Non-Allocated HC</th>
              <th className="px-3 py-2">Target Opt HC</th>
              <th className="px-3 py-2">Top Suggested Action</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.division_id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/resources/${row.division_id}`}
                    className="text-sky-700 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.total_headcount}</td>
                <td className="px-3 py-2">{row.non_allocated_count}</td>
                <td className="px-3 py-2">{row.target_opt_count}</td>
                <td className="px-3 py-2">{row.top_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
