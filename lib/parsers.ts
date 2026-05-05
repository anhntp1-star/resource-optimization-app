import Papa from "papaparse";
import type {
  DivisionPnL,
  ImportError,
  ImportResult,
  ResourceMonth,
} from "@/lib/types";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const PNL_REQUIRED = [
  "division_id",
  "month",
  "gm_actual_pct",
  "gm_forecast_pct",
] as const;

const PNL_OPTIONAL_NUMBER = [
  "revenue_actual",
  "cost_actual",
  "revenue_forecast",
  "cost_forecast",
] as const;

const RESOURCE_REQUIRED = [
  "resource_id",
  "division_id",
  "role",
  "month",
  "allocation_status",
  "allocation_percentage",
] as const;

const ALLOC_STATUS = new Set(["Allocated", "Non-Allocated"]);

function parseNumber(raw: string | undefined): number | null {
  if (raw === "" || raw === undefined || raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parsePnLCsv(csv: string): ImportResult<DivisionPnL> {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  const headers = result.meta.fields ?? [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  for (const col of PNL_REQUIRED) {
    if (!headers.includes(col)) {
      errors.push({ line: 1, message: `Missing column: ${col}` });
    }
  }
  if (errors.length > 0) return { data: [], errors, warnings };

  const data: (DivisionPnL & { division_name: string })[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const line = i + 2;

    if (!row.division_id || row.division_id.trim() === "") {
      errors.push({ line, column: "division_id", message: "Empty division_id" });
      continue;
    }
    const month = row.month?.trim();
    if (!month || !MONTH_RE.test(month)) {
      errors.push({ line, column: "month", message: "Invalid month (expected YYYY-MM)", raw: row.month });
      continue;
    }
    const gmA = parseNumber(row.gm_actual_pct);
    if (gmA === null) {
      errors.push({ line, column: "gm_actual_pct", message: "Not a number", raw: row.gm_actual_pct });
      continue;
    }
    const gmF = parseNumber(row.gm_forecast_pct);
    if (gmF === null) {
      errors.push({ line, column: "gm_forecast_pct", message: "Not a number", raw: row.gm_forecast_pct });
      continue;
    }

    const optionalNumbers: Record<string, number> = {};
    let optionalError = false;
    for (const col of PNL_OPTIONAL_NUMBER) {
      const v = row[col];
      if (v === undefined || v === "") {
        optionalNumbers[col] = 0;
        continue;
      }
      const n = parseNumber(v);
      if (n === null) {
        errors.push({ line, column: col, message: "Not a number", raw: v });
        optionalError = true;
        break;
      }
      optionalNumbers[col] = n;
    }
    if (optionalError) continue;

    const key = `${row.division_id}|${month}`;
    if (seen.has(key)) {
      errors.push({ line, message: `Duplicate (division_id, month) ${key}` });
      continue;
    }
    seen.add(key);

    data.push({
      division_id: row.division_id.trim(),
      division_name: row.division_name?.trim() || row.division_id.trim(),
      month,
      revenue_actual: optionalNumbers.revenue_actual,
      cost_actual: optionalNumbers.cost_actual,
      gm_actual_pct: gmA,
      revenue_forecast: optionalNumbers.revenue_forecast,
      cost_forecast: optionalNumbers.cost_forecast,
      gm_forecast_pct: gmF,
    });
  }

  return errors.length > 0 ? { data: [], errors, warnings } : { data, errors, warnings };
}

export function parseResourcesCsv(csv: string): ImportResult<ResourceMonth> {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  const headers = result.meta.fields ?? [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  for (const col of RESOURCE_REQUIRED) {
    if (!headers.includes(col)) {
      errors.push({ line: 1, message: `Missing column: ${col}` });
    }
  }
  if (errors.length > 0) return { data: [], errors, warnings };

  const data: ResourceMonth[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const line = i + 2;

    const month = row.month?.trim();
    if (!month || !MONTH_RE.test(month)) {
      errors.push({ line, column: "month", message: "Invalid month (expected YYYY-MM)", raw: row.month });
      continue;
    }
    const status = row.allocation_status?.trim();
    if (!status || !ALLOC_STATUS.has(status)) {
      errors.push({ line, column: "allocation_status", message: "Must be 'Allocated' or 'Non-Allocated'", raw: row.allocation_status });
      continue;
    }
    const pct = parseNumber(row.allocation_percentage);
    if (pct === null || pct < 0 || pct > 100) {
      errors.push({ line, column: "allocation_percentage", message: "Must be a number 0..100", raw: row.allocation_percentage });
      continue;
    }
    if (!row.resource_id?.trim()) {
      errors.push({ line, column: "resource_id", message: "Empty resource_id" });
      continue;
    }
    if (!row.division_id?.trim()) {
      errors.push({ line, column: "division_id", message: "Empty division_id" });
      continue;
    }
    if (!row.role?.trim()) {
      errors.push({ line, column: "role", message: "Empty role" });
      continue;
    }

    const key = `${row.resource_id}|${month}`;
    if (seen.has(key)) {
      errors.push({ line, message: `Duplicate (resource_id, month) ${key}` });
      continue;
    }
    seen.add(key);

    data.push({
      resource_id: row.resource_id.trim(),
      division_id: row.division_id.trim(),
      role: row.role.trim(),
      month,
      allocation_status: status as "Allocated" | "Non-Allocated",
      allocation_percentage: pct,
    });
  }

  return errors.length > 0 ? { data: [], errors, warnings } : { data, errors, warnings };
}
