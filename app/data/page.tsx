"use client";
import { useState } from "react";
import { CsvDropzone } from "@/components/CsvDropzone";
import { ImportReport } from "@/components/ImportReport";
import { parsePnLCsv, parseResourcesCsv } from "@/lib/parsers";
import { clearAll, setPnL, setResources } from "@/lib/store";
import { useHasCustomData } from "@/lib/useDataset";
import type { DivisionPnL, ImportResult, ResourceMonth } from "@/lib/types";

export default function DataPage() {
  const isCustom = useHasCustomData();
  const [pnlResult, setPnlResult] = useState<{
    result: ImportResult<DivisionPnL>;
    fileName: string;
  } | null>(null);
  const [resResult, setResResult] = useState<{
    result: ImportResult<ResourceMonth>;
    fileName: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Module</h1>
        <p className="text-sm text-slate-500">
          Upload Finance PnL and Resource Allocation CSVs. Uploaded data persists in
          your browser and replaces the seeded mock data on every dashboard.{" "}
          <a
            href="/data/samples/pnl-sample.csv"
            className="text-sky-700 hover:underline"
            download
          >
            Download a PnL sample
          </a>{" "}
          ·{" "}
          <a
            href="/data/samples/resources-sample.csv"
            className="text-sky-700 hover:underline"
            download
          >
            Download a Resources sample
          </a>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">PnL CSV</h2>
        <CsvDropzone
          label="Drop pnl.csv here"
          onFile={(text, fileName) =>
            setPnlResult({ result: parsePnLCsv(text), fileName })
          }
        />
        {pnlResult && <ImportReport result={pnlResult.result} fileName={pnlResult.fileName} />}
        {pnlResult && pnlResult.result.errors.length === 0 && (
          <button
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            onClick={() => {
              setPnL(pnlResult.result.data);
              flash(`Applied ${pnlResult.result.data.length} PnL rows`);
            }}
          >
            Apply PnL
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Resources CSV</h2>
        <CsvDropzone
          label="Drop resources.csv here"
          onFile={(text, fileName) =>
            setResResult({ result: parseResourcesCsv(text), fileName })
          }
        />
        {resResult && <ImportReport result={resResult.result} fileName={resResult.fileName} />}
        {resResult && resResult.result.errors.length === 0 && (
          <button
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            onClick={() => {
              setResources(resResult.result.data);
              flash(`Applied ${resResult.result.data.length} resource rows`);
            }}
          >
            Apply Resources
          </button>
        )}
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-semibold">Reset</h2>
        <p className="text-xs text-slate-500">
          Clears uploaded PnL and Resource data. Dashboards revert to seeded mock data.
        </p>
        <button
          disabled={!isCustom}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => {
            clearAll();
            flash("Reset to mock data");
          }}
        >
          Reset to mock data
        </button>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
