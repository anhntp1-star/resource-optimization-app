"use client";
import type { ImportError, ImportResult } from "@/lib/types";

export function ImportReport<T>({
  result,
  fileName,
}: {
  result: ImportResult<T>;
  fileName: string;
}) {
  const { data, errors, warnings } = result;
  const ok = errors.length === 0;
  return (
    <div className="rounded-lg border bg-white">
      <div
        className={`flex items-center justify-between rounded-t-lg px-4 py-2 text-sm font-medium ${
          ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
        }`}
      >
        <span>
          {ok
            ? `✓ ${fileName} — loaded ${data.length} rows`
            : `✗ ${fileName} — ${errors.length} error${errors.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {errors.length > 0 && <ErrorTable errors={errors} kind="error" />}
      {warnings.length > 0 && <ErrorTable errors={warnings} kind="warning" />}
      {ok && data.length > 0 && (
        <div className="px-4 py-3 text-xs text-slate-600">
          Preview: first 3 rows look like
          <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 font-mono text-[11px]">
            {JSON.stringify(data.slice(0, 3), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ErrorTable({ errors, kind }: { errors: ImportError[]; kind: "error" | "warning" }) {
  return (
    <table className="w-full text-xs">
      <thead className={kind === "error" ? "bg-red-50" : "bg-amber-50"}>
        <tr className="text-left">
          <th className="px-3 py-1.5">Line</th>
          <th className="px-3 py-1.5">Column</th>
          <th className="px-3 py-1.5">Message</th>
          <th className="px-3 py-1.5">Value</th>
        </tr>
      </thead>
      <tbody>
        {errors.map((e, i) => (
          <tr key={i} className="border-t">
            <td className="px-3 py-1.5 font-mono">{e.line}</td>
            <td className="px-3 py-1.5 font-mono">{e.column ?? ""}</td>
            <td className="px-3 py-1.5">{e.message}</td>
            <td className="px-3 py-1.5 font-mono text-slate-500">{e.raw ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
