# Data Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/data` page that lets Finance upload CSV files for PnL and Resources, validate them client-side, persist them in `localStorage`, and have all existing dashboards reflect the uploaded dataset automatically.

**Architecture:** Move seed JSON from `/data/` to `/public/data/` so the browser can fetch the fallback. Convert the four existing page components to Client Components reading from a unified `useDataset()` hook. Add pure-TS modules for CSV parsing/validation, derivation of divisions+headcount, and `localStorage` access. New `/data` page wires the upload UI to the store; everything else recomputes automatically through the hook.

**Tech Stack:** Next.js 14 (App Router, Client Components), TypeScript, Tailwind, PapaParse 5.4, Vitest.

**Reference spec:** [docs/superpowers/specs/2026-04-25-data-module-design.md](../specs/2026-04-25-data-module-design.md)

---

## File map

**Created:**

| Path | Responsibility |
|---|---|
| `lib/store.ts` | Typed `localStorage` accessors (`getPnL`, `setPnL`, `getResources`, `setResources`, `clearAll`) + custom `dataset-changed` event dispatch |
| `lib/parsers.ts` | `parsePnLCsv`, `parseResourcesCsv` → `ImportResult` (validates schema + rows) |
| `lib/derive.ts` | `deriveDivisions(pnl)`, `deriveHeadcount(resources)` |
| `lib/useDataset.ts` | Client hook returning `{ dataset, isCustom, isLoading, refresh }` |
| `app/data/page.tsx` | Two upload zones + result panels + Reset button |
| `components/CsvDropzone.tsx` | File picker / drop target |
| `components/ImportReport.tsx` | Errors table + sample preview |
| `components/DatasetBadge.tsx` | Header pill: "Mock data" / "Custom data" |
| `tests/parsers.test.ts` | Schema + per-row + cross-file validation |
| `tests/derive.test.ts` | Deriving divisions and headcount |
| `tests/store.test.ts` | Round-trip with `localStorage` shim |
| `public/data/samples/pnl-sample.csv`, `public/data/samples/resources-sample.csv` | Sample CSVs the user can re-import |

**Moved:**

| From | To |
|---|---|
| `data/divisions.json` | `public/data/divisions.json` |
| `data/pnl.json` | `public/data/pnl.json` |
| `data/resources.json` | `public/data/resources.json` |
| `data/headcount.json` | `public/data/headcount.json` |

**Modified:**

| Path | Change |
|---|---|
| `package.json` | add `papaparse` + `@types/papaparse` |
| `lib/types.ts` | add `ImportError`, `ImportResult<T>` |
| `lib/data.ts` | path: `data/` → `public/data/` |
| `app/layout.tsx` | nav link "Data" + `<DatasetBadge/>` slot |
| `app/page.tsx` | `'use client'` + `useDataset()` |
| `app/resources/page.tsx` | `'use client'` + `useDataset()` |
| `app/resources/[divisionId]/page.tsx` | `'use client'` + `useDataset()` |
| `app/alerts/page.tsx` | `'use client'` + `useDataset()` |
| `scripts/acceptance-check.ts` | path: `data/` → `public/data/` |
| `scripts/generate-mock.ts` | output to `public/data/` |
| `tests/mock-data.test.ts` | path: `data/` → `public/data/` |

---

## Task 1: Relocate seed JSON to `public/data/`

**Files:**
- Move: `data/divisions.json` → `public/data/divisions.json`
- Move: `data/pnl.json` → `public/data/pnl.json`
- Move: `data/resources.json` → `public/data/resources.json`
- Move: `data/headcount.json` → `public/data/headcount.json`
- Modify: `lib/data.ts`
- Modify: `scripts/acceptance-check.ts`
- Modify: `scripts/generate-mock.ts`
- Modify: `tests/mock-data.test.ts`

- [ ] **Step 1.1: Move JSON files via git mv**

```bash
mkdir -p public/data
git mv data/divisions.json public/data/divisions.json
git mv data/pnl.json public/data/pnl.json
git mv data/resources.json public/data/resources.json
git mv data/headcount.json public/data/headcount.json
rmdir data
```

- [ ] **Step 1.2: Update `lib/data.ts` to read from `public/data/`**

Replace the body of `lib/data.ts` with:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  ResourceMonth,
} from "@/lib/types";

function read<T>(name: string): T {
  const path = resolve(process.cwd(), "public", "data", name);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function loadDivisions(): Division[] {
  return read<Division[]>("divisions.json");
}
export function loadPnL(): DivisionPnL[] {
  return read<DivisionPnL[]>("pnl.json");
}
export function loadResources(): ResourceMonth[] {
  return read<ResourceMonth[]>("resources.json");
}
export function loadHeadcount(): HeadcountSnapshot[] {
  return read<HeadcountSnapshot[]>("headcount.json");
}

export function getAsOfMonth(pnl: DivisionPnL[]): string {
  return pnl.map((p) => p.month).sort().slice(-1)[0];
}
```

- [ ] **Step 1.3: Update `scripts/acceptance-check.ts` path**

Find this line in `scripts/acceptance-check.ts`:

```ts
function read<T>(name: string): T {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "data", name), "utf-8"),
  ) as T;
}
```

Replace with:

```ts
function read<T>(name: string): T {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "public", "data", name), "utf-8"),
  ) as T;
}
```

- [ ] **Step 1.4: Update `scripts/generate-mock.ts` output path**

In `scripts/generate-mock.ts`, find:

```ts
const dataDir = resolve(root, "data");
```

Replace with:

```ts
const dataDir = resolve(root, "public", "data");
```

- [ ] **Step 1.5: Update `tests/mock-data.test.ts` path**

In `tests/mock-data.test.ts`, find:

```ts
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(root, "data", name), "utf-8")) as T;
```

Replace with:

```ts
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(root, "public", "data", name), "utf-8")) as T;
```

- [ ] **Step 1.6: Run all tests + acceptance check + build**

Run: `npm test`
Expected: 5 suites, 53 tests pass.

Run: `npx tsx scripts/acceptance-check.ts`
Expected: prints risk table and `All acceptance checks PASSED`.

Run: `npm run build`
Expected: `Compiled successfully`, all 4 routes emit.

- [ ] **Step 1.7: Commit**

```bash
git add public/data/ lib/data.ts scripts/acceptance-check.ts scripts/generate-mock.ts tests/mock-data.test.ts
git commit -m "refactor(data): move seed JSON to public/data/ for browser access"
```

---

## Task 2: Install PapaParse

**Files:**
- Modify: `package.json`

- [ ] **Step 2.1: Install dependencies**

Run: `npm install papaparse@5.4.1 && npm install --save-dev @types/papaparse@5.3.14`
Expected: 2 packages added; `package.json` and `package-lock.json` updated.

- [ ] **Step 2.2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add papaparse and @types/papaparse"
```

---

## Task 3: Extend `lib/types.ts` with import types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 3.1: Append the following to `lib/types.ts`**

```ts
export type ImportError = {
  line: number;
  column?: string;
  message: string;
  raw?: string;
};

export type ImportResult<T> = {
  data: T[];
  errors: ImportError[];
  warnings: ImportError[];
};
```

- [ ] **Step 3.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3.3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add ImportError and ImportResult"
```

---

## Task 4: CSV parsers — PnL

**Files:**
- Create: `tests/parsers.test.ts`
- Create: `lib/parsers.ts`

- [ ] **Step 4.1: Write failing tests for `parsePnLCsv`**

```ts
// tests/parsers.test.ts
import { describe, it, expect } from "vitest";
import { parsePnLCsv, parseResourcesCsv } from "@/lib/parsers";

describe("parsePnLCsv", () => {
  it("parses a valid minimal CSV", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.data).toEqual([
      {
        division_id: "D01",
        division_name: "D01",
        month: "2026-04",
        gm_actual_pct: 15.2,
        gm_forecast_pct: 16.0,
        revenue_actual: 0,
        cost_actual: 0,
        revenue_forecast: 0,
        cost_forecast: 0,
      },
    ]);
  });

  it("uses division_name when present", () => {
    const csv = [
      "division_id,division_name,month,gm_actual_pct,gm_forecast_pct",
      "D01,Cloud,2026-04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data[0].division_name).toBe("Cloud");
  });

  it("captures optional revenue/cost columns when present", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct,revenue_actual,cost_actual,revenue_forecast,cost_forecast",
      "D01,2026-04,15.2,16.0,1000000,850000,1100000,924000",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data[0].revenue_actual).toBe(1000000);
    expect(r.data[0].cost_actual).toBe(850000);
  });

  it("reports missing required columns", () => {
    const csv = ["division_id,month,gm_actual_pct", "D01,2026-04,15.2"].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data).toEqual([]);
    expect(r.errors[0].message).toContain("Missing column: gm_forecast_pct");
  });

  it("reports a row with bad numeric value", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,abc,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.data).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].column).toBe("gm_actual_pct");
    expect(r.errors[0].raw).toBe("abc");
  });

  it("reports a row with malformed month", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026/04,15.2,16.0",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors[0].column).toBe("month");
  });

  it("reports duplicate (division_id, month)", () => {
    const csv = [
      "division_id,month,gm_actual_pct,gm_forecast_pct",
      "D01,2026-04,15.2,16.0",
      "D01,2026-04,14.0,15.5",
    ].join("\n");
    const r = parsePnLCsv(csv);
    expect(r.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });
});
```

- [ ] **Step 4.2: Run tests to confirm they fail**

Run: `npm test -- tests/parsers.test.ts`
Expected: FAIL — `Cannot find module '@/lib/parsers'`.

- [ ] **Step 4.3: Implement `parsePnLCsv` in `lib/parsers.ts`**

Create `lib/parsers.ts`:

```ts
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

function parseNumber(raw: string): number | null {
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

  const data: DivisionPnL[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const line = i + 2; // header is line 1

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
      // division_name handled below; cast happens once below
      month,
      revenue_actual: optionalNumbers.revenue_actual,
      cost_actual: optionalNumbers.cost_actual,
      gm_actual_pct: gmA,
      revenue_forecast: optionalNumbers.revenue_forecast,
      cost_forecast: optionalNumbers.cost_forecast,
      gm_forecast_pct: gmF,
    } as DivisionPnL & { division_name: string });
    // Attach division_name after the fact (not part of base type but used by deriveDivisions)
    (data[data.length - 1] as DivisionPnL & { division_name: string }).division_name =
      row.division_name?.trim() || row.division_id.trim();
  }

  return errors.length > 0 ? { data: [], errors, warnings } : { data, errors, warnings };
}

export function parseResourcesCsv(csv: string): ImportResult<ResourceMonth> {
  // implemented in Task 5
  throw new Error("parseResourcesCsv not implemented yet");
}
```

Note: the `DivisionPnL & { division_name: string }` cast tracks an extra field used downstream by `deriveDivisions`. We do not modify the base `DivisionPnL` type — `division_name` is metadata associated with the row, surfaced through derivation.

- [ ] **Step 4.4: Run PnL tests to confirm they pass**

Run: `npm test -- tests/parsers.test.ts -t parsePnLCsv`
Expected: 7 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add tests/parsers.test.ts lib/parsers.ts
git commit -m "feat(parsers): add parsePnLCsv with schema, row, and duplicate checks"
```

---

## Task 5: CSV parsers — Resources

**Files:**
- Modify: `tests/parsers.test.ts`
- Modify: `lib/parsers.ts`

- [ ] **Step 5.1: Append failing tests for `parseResourcesCsv`**

Append to `tests/parsers.test.ts`:

```ts
describe("parseResourcesCsv", () => {
  it("parses a valid CSV", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,80",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.data[0]).toEqual({
      resource_id: "R0001",
      division_id: "D01",
      role: "Engineer",
      month: "2026-04",
      allocation_status: "Allocated",
      allocation_percentage: 80,
    });
  });

  it("rejects invalid allocation_status", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Pending,80",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].column).toBe("allocation_status");
    expect(r.errors[0].raw).toBe("Pending");
  });

  it("rejects allocation_percentage out of range", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,150",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].column).toBe("allocation_percentage");
  });

  it("rejects duplicate (resource_id, month)", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status,allocation_percentage",
      "R0001,D01,Engineer,2026-04,Allocated,80",
      "R0001,D01,Engineer,2026-04,Non-Allocated,0",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("reports missing required column", () => {
    const csv = [
      "resource_id,division_id,role,month,allocation_status",
      "R0001,D01,Engineer,2026-04,Allocated",
    ].join("\n");
    const r = parseResourcesCsv(csv);
    expect(r.errors[0].message).toContain("Missing column: allocation_percentage");
  });
});
```

- [ ] **Step 5.2: Run tests to confirm they fail**

Run: `npm test -- tests/parsers.test.ts -t parseResourcesCsv`
Expected: FAIL — `parseResourcesCsv not implemented yet`.

- [ ] **Step 5.3: Implement `parseResourcesCsv`**

Replace the placeholder in `lib/parsers.ts` with:

```ts
const RESOURCE_REQUIRED = [
  "resource_id",
  "division_id",
  "role",
  "month",
  "allocation_status",
  "allocation_percentage",
] as const;

const ALLOC_STATUS = new Set(["Allocated", "Non-Allocated"]);

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
```

- [ ] **Step 5.4: Run all parser tests**

Run: `npm test -- tests/parsers.test.ts`
Expected: 12 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add lib/parsers.ts tests/parsers.test.ts
git commit -m "feat(parsers): add parseResourcesCsv with status enum and 0..100 range checks"
```

---

## Task 6: Derivation module

**Files:**
- Create: `tests/derive.test.ts`
- Create: `lib/derive.ts`

- [ ] **Step 6.1: Write failing tests**

```ts
// tests/derive.test.ts
import { describe, it, expect } from "vitest";
import { deriveDivisions, deriveHeadcount } from "@/lib/derive";
import type { DivisionPnL, ResourceMonth } from "@/lib/types";

describe("deriveDivisions", () => {
  it("returns one entry per unique division_id, using division_name when present", () => {
    const pnl: (DivisionPnL & { division_name?: string })[] = [
      {
        division_id: "D01",
        division_name: "Cloud",
        month: "2026-04",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 10,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 11,
      },
      {
        division_id: "D01",
        division_name: "Cloud",
        month: "2026-03",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 9,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 10,
      },
      {
        division_id: "D02",
        month: "2026-04",
        revenue_actual: 0,
        cost_actual: 0,
        gm_actual_pct: 25,
        revenue_forecast: 0,
        cost_forecast: 0,
        gm_forecast_pct: 26,
      },
    ];
    const out = deriveDivisions(pnl);
    expect(out).toEqual([
      { division_id: "D01", name: "Cloud" },
      { division_id: "D02", name: "D02" },
    ]);
  });
});

describe("deriveHeadcount", () => {
  const r = (
    resource_id: string,
    division_id: string,
    role: string,
    month: string,
  ): ResourceMonth => ({
    resource_id,
    division_id,
    role,
    month,
    allocation_status: "Allocated",
    allocation_percentage: 100,
  });

  it("counts unique resources per division and month", () => {
    const resources = [
      r("R1", "D01", "Eng", "2026-04"),
      r("R2", "D01", "Eng", "2026-04"),
      r("R3", "D01", "PM", "2026-04"),
      r("R1", "D01", "Eng", "2026-03"),
    ];
    const out = deriveHeadcount(resources);
    const apr = out.find((h) => h.division_id === "D01" && h.month === "2026-04")!;
    expect(apr.total_headcount).toBe(3);
    expect(apr.by_role).toEqual({ Eng: 2, PM: 1 });
    const mar = out.find((h) => h.division_id === "D01" && h.month === "2026-03")!;
    expect(mar.total_headcount).toBe(1);
  });
});
```

- [ ] **Step 6.2: Run tests to confirm they fail**

Run: `npm test -- tests/derive.test.ts`
Expected: FAIL — `Cannot find module '@/lib/derive'`.

- [ ] **Step 6.3: Implement `lib/derive.ts`**

```ts
// lib/derive.ts
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  ResourceMonth,
} from "@/lib/types";

type PnLRowWithName = DivisionPnL & { division_name?: string };

export function deriveDivisions(pnl: PnLRowWithName[]): Division[] {
  const map = new Map<string, string>();
  for (const row of pnl) {
    if (!map.has(row.division_id)) {
      map.set(row.division_id, row.division_name?.trim() || row.division_id);
    }
  }
  return [...map.entries()].map(([division_id, name]) => ({ division_id, name }));
}

export function deriveHeadcount(resources: ResourceMonth[]): HeadcountSnapshot[] {
  const buckets = new Map<string, Map<string, Set<string>>>();
  for (const r of resources) {
    const key = `${r.division_id}|${r.month}`;
    let roleMap = buckets.get(key);
    if (!roleMap) {
      roleMap = new Map();
      buckets.set(key, roleMap);
    }
    let set = roleMap.get(r.role);
    if (!set) {
      set = new Set();
      roleMap.set(r.role, set);
    }
    set.add(r.resource_id);
  }

  const out: HeadcountSnapshot[] = [];
  for (const [key, roleMap] of buckets) {
    const [division_id, month] = key.split("|");
    const by_role: Record<string, number> = {};
    let total = 0;
    for (const [role, ids] of roleMap) {
      by_role[role] = ids.size;
      total += ids.size;
    }
    out.push({ division_id, month, total_headcount: total, by_role });
  }
  return out;
}
```

- [ ] **Step 6.4: Run tests to confirm they pass**

Run: `npm test -- tests/derive.test.ts`
Expected: 2 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add tests/derive.test.ts lib/derive.ts
git commit -m "feat(derive): derive divisions and headcount from PnL + resources"
```

---

## Task 7: localStorage store

**Files:**
- Create: `tests/store.test.ts`
- Create: `lib/store.ts`

- [ ] **Step 7.1: Write failing tests**

```ts
// tests/store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPnL,
  setPnL,
  getResources,
  setResources,
  hasCustomData,
  clearAll,
  DATASET_CHANGED_EVENT,
} from "@/lib/store";
import type { DivisionPnL, ResourceMonth } from "@/lib/types";

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => void map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeMemoryStorage());
  vi.stubGlobal(
    "window",
    { dispatchEvent: vi.fn() },
  );
});

const samplePnL: DivisionPnL[] = [
  {
    division_id: "D01",
    month: "2026-04",
    revenue_actual: 100,
    cost_actual: 90,
    gm_actual_pct: 10,
    revenue_forecast: 100,
    cost_forecast: 90,
    gm_forecast_pct: 10,
  },
];

const sampleResources: ResourceMonth[] = [
  {
    resource_id: "R1",
    division_id: "D01",
    role: "Eng",
    month: "2026-04",
    allocation_status: "Allocated",
    allocation_percentage: 80,
  },
];

describe("store", () => {
  it("returns null before any set", () => {
    expect(getPnL()).toBeNull();
    expect(getResources()).toBeNull();
    expect(hasCustomData()).toBe(false);
  });

  it("round-trips PnL data", () => {
    setPnL(samplePnL);
    expect(getPnL()).toEqual(samplePnL);
    expect(hasCustomData()).toBe(true);
  });

  it("round-trips Resources data", () => {
    setResources(sampleResources);
    expect(getResources()).toEqual(sampleResources);
  });

  it("clearAll removes both", () => {
    setPnL(samplePnL);
    setResources(sampleResources);
    clearAll();
    expect(getPnL()).toBeNull();
    expect(getResources()).toBeNull();
    expect(hasCustomData()).toBe(false);
  });

  it("setPnL dispatches dataset-changed event", () => {
    setPnL(samplePnL);
    expect(window.dispatchEvent).toHaveBeenCalled();
    const evt = (window.dispatchEvent as unknown as { mock: { calls: Event[][] } }).mock.calls[0][0];
    expect(evt.type).toBe(DATASET_CHANGED_EVENT);
  });
});
```

- [ ] **Step 7.2: Run tests to confirm they fail**

Run: `npm test -- tests/store.test.ts`
Expected: FAIL — `Cannot find module '@/lib/store'`.

- [ ] **Step 7.3: Implement `lib/store.ts`**

```ts
// lib/store.ts
import type { DivisionPnL, ResourceMonth } from "@/lib/types";

const KEY_PNL = "dataset.pnl";
const KEY_RESOURCES = "dataset.resources";
export const DATASET_CHANGED_EVENT = "dataset-changed";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DATASET_CHANGED_EVENT));
}

export function getPnL(): DivisionPnL[] | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<DivisionPnL[]>(localStorage.getItem(KEY_PNL));
}

export function setPnL(rows: DivisionPnL[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY_PNL, JSON.stringify(rows));
  notify();
}

export function getResources(): ResourceMonth[] | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<ResourceMonth[]>(localStorage.getItem(KEY_RESOURCES));
}

export function setResources(rows: ResourceMonth[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY_RESOURCES, JSON.stringify(rows));
  notify();
}

export function hasCustomData(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(KEY_PNL) !== null || localStorage.getItem(KEY_RESOURCES) !== null;
}

export function clearAll(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY_PNL);
  localStorage.removeItem(KEY_RESOURCES);
  notify();
}
```

- [ ] **Step 7.4: Run tests to confirm they pass**

Run: `npm test -- tests/store.test.ts`
Expected: 5 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add tests/store.test.ts lib/store.ts
git commit -m "feat(store): add localStorage accessors and dataset-changed event"
```

---

## Task 8: `useDataset` hook

**Files:**
- Create: `lib/useDataset.ts`

- [ ] **Step 8.1: Implement `lib/useDataset.ts`**

```ts
// lib/useDataset.ts
"use client";
import { useEffect, useState, useCallback } from "react";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  Month,
  ResourceMonth,
} from "@/lib/types";
import {
  DATASET_CHANGED_EVENT,
  getPnL,
  getResources,
  hasCustomData,
} from "@/lib/store";
import { deriveDivisions, deriveHeadcount } from "@/lib/derive";

export type Dataset = {
  divisions: Division[];
  pnl: DivisionPnL[];
  resources: ResourceMonth[];
  headcount: HeadcountSnapshot[];
  asOf: Month;
  isCustom: boolean;
};

async function fetchSeed(): Promise<Omit<Dataset, "isCustom">> {
  const [divisions, pnl, resources, headcount] = await Promise.all([
    fetch("/data/divisions.json").then((r) => r.json()),
    fetch("/data/pnl.json").then((r) => r.json()),
    fetch("/data/resources.json").then((r) => r.json()),
    fetch("/data/headcount.json").then((r) => r.json()),
  ]);
  const asOf = (pnl as DivisionPnL[]).map((p) => p.month).sort().slice(-1)[0];
  return { divisions, pnl, resources, headcount, asOf };
}

function buildCustomDataset(
  customPnL: DivisionPnL[] | null,
  customResources: ResourceMonth[] | null,
  seed: Omit<Dataset, "isCustom">,
): Dataset {
  const pnl = customPnL ?? seed.pnl;
  const resources = customResources ?? seed.resources;
  const divisions = customPnL ? deriveDivisions(pnl) : seed.divisions;
  const headcount = customResources ? deriveHeadcount(resources) : seed.headcount;
  const asOf = pnl.map((p) => p.month).sort().slice(-1)[0];
  return {
    divisions,
    pnl,
    resources,
    headcount,
    asOf,
    isCustom: customPnL !== null || customResources !== null,
  };
}

export function useDataset(): {
  dataset: Dataset | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const [seed, setSeed] = useState<Omit<Dataset, "isCustom"> | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isLoading, setLoading] = useState(true);

  const recompute = useCallback(
    (s: Omit<Dataset, "isCustom"> | null) => {
      if (!s) return;
      setDataset(buildCustomDataset(getPnL(), getResources(), s));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchSeed().then((s) => {
      if (cancelled) return;
      setSeed(s);
      setDataset(buildCustomDataset(getPnL(), getResources(), s));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => recompute(seed);
    window.addEventListener(DATASET_CHANGED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(DATASET_CHANGED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [seed, recompute]);

  const refresh = useCallback(() => recompute(seed), [seed, recompute]);

  return { dataset, isLoading, refresh };
}

export function useHasCustomData(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const update = () => setV(hasCustomData());
    update();
    window.addEventListener(DATASET_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(DATASET_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return v;
}
```

- [ ] **Step 8.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 8.3: Commit**

```bash
git add lib/useDataset.ts
git commit -m "feat(hook): add useDataset client hook with custom-over-seed merging"
```

---

## Task 9: Refactor `app/page.tsx` to client component

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 9.1: Replace `app/page.tsx` content**

```tsx
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
```

- [ ] **Step 9.2: Verify TypeScript compiles and build runs**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build prints `Compiled successfully` and shows `/` as a dynamic route.

- [ ] **Step 9.3: Commit**

```bash
git add app/page.tsx
git commit -m "refactor(ui): make Risk Dashboard read from useDataset()"
```

---

## Task 10: Refactor `app/resources/page.tsx`

**Files:**
- Modify: `app/resources/page.tsx`

- [ ] **Step 10.1: Replace contents**

```tsx
"use client";
import Link from "next/link";
import { useDataset } from "@/lib/useDataset";
import { buildDivisionRiskRows, buildOptimizationTable } from "@/lib/views";

export default function ResourcesIndex() {
  const { dataset, isLoading } = useDataset();
  if (isLoading || !dataset) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const { divisions, pnl, resources, headcount, asOf } = dataset;
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
```

- [ ] **Step 10.2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 10.3: Commit**

```bash
git add app/resources/page.tsx
git commit -m "refactor(ui): make Optimization Table read from useDataset()"
```

---

## Task 11: Refactor `app/resources/[divisionId]/page.tsx`

**Files:**
- Modify: `app/resources/[divisionId]/page.tsx`

- [ ] **Step 11.1: Replace contents**

```tsx
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
```

- [ ] **Step 11.2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 11.3: Commit**

```bash
git add 'app/resources/[divisionId]/page.tsx'
git commit -m "refactor(ui): make Resource Detail page read from useDataset()"
```

---

## Task 12: Refactor `app/alerts/page.tsx`

**Files:**
- Modify: `app/alerts/page.tsx`

- [ ] **Step 12.1: Replace contents**

```tsx
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
```

- [ ] **Step 12.2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 12.3: Commit**

```bash
git add app/alerts/page.tsx
git commit -m "refactor(ui): make Alerts page read from useDataset()"
```

---

## Task 13: DatasetBadge component

**Files:**
- Create: `components/DatasetBadge.tsx`

- [ ] **Step 13.1: Create the component**

```tsx
// components/DatasetBadge.tsx
"use client";
import { useHasCustomData } from "@/lib/useDataset";

export function DatasetBadge() {
  const isCustom = useHasCustomData();
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        isCustom ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"
      }`}
      title={isCustom ? "Showing uploaded data" : "Showing seeded mock data"}
    >
      {isCustom ? "Custom data" : "Mock data"}
    </span>
  );
}
```

- [ ] **Step 13.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 13.3: Commit**

```bash
git add components/DatasetBadge.tsx
git commit -m "feat(ui): add DatasetBadge showing Mock vs Custom data"
```

---

## Task 14: Update `app/layout.tsx` with Data link + Badge

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 14.1: Replace contents**

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { DatasetBadge } from "@/components/DatasetBadge";

export const metadata = { title: "Resource Optimization" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 text-sm font-medium">
            <div className="flex gap-6">
              <Link href="/">Risk Dashboard</Link>
              <Link href="/resources">Optimization</Link>
              <Link href="/alerts">Alerts</Link>
              <Link href="/data">Data</Link>
            </div>
            <DatasetBadge />
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 14.2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 14.3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): add Data nav link and DatasetBadge in header"
```

---

## Task 15: CsvDropzone component

**Files:**
- Create: `components/CsvDropzone.tsx`

- [ ] **Step 15.1: Create the component**

```tsx
// components/CsvDropzone.tsx
"use client";
import { useRef, useState } from "react";

export function CsvDropzone({
  label,
  onFile,
}: {
  label: string;
  onFile: (text: string, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function handle(file: File) {
    const text = await file.text();
    onFile(text, file.name);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await handle(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm transition-colors ${
        over ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-white"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-1 text-xs text-slate-500">Drop a CSV file or click to choose</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handle(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 15.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 15.3: Commit**

```bash
git add components/CsvDropzone.tsx
git commit -m "feat(ui): add CsvDropzone component"
```

---

## Task 16: ImportReport component

**Files:**
- Create: `components/ImportReport.tsx`

- [ ] **Step 16.1: Create the component**

```tsx
// components/ImportReport.tsx
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
```

- [ ] **Step 16.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 16.3: Commit**

```bash
git add components/ImportReport.tsx
git commit -m "feat(ui): add ImportReport showing errors, warnings, and preview"
```

---

## Task 17: Sample CSVs in `public/data/samples/`

**Files:**
- Create: `public/data/samples/pnl-sample.csv`
- Create: `public/data/samples/resources-sample.csv`

- [ ] **Step 17.1: Create `public/data/samples/pnl-sample.csv`**

```csv
division_id,division_name,month,gm_actual_pct,gm_forecast_pct,revenue_actual,cost_actual,revenue_forecast,cost_forecast
D01,Cloud Services,2026-02,6.20,4.50,1100000,1031800,1120000,1069600
D01,Cloud Services,2026-03,5.60,3.90,1080000,1019520,1090000,1047490
D01,Cloud Services,2026-04,5.00,3.40,1050000,997500,1080000,1043280
D02,Data & AI,2026-02,28.30,30.50,950000,681150,940000,653300
D02,Data & AI,2026-03,28.80,30.70,960000,683520,945000,654765
D02,Data & AI,2026-04,29.50,31.00,975000,687375,960000,662400
D03,Enterprise Apps,2026-02,10.90,9.80,1380000,1229580,1390000,1253780
D03,Enterprise Apps,2026-03,11.20,9.90,1395000,1238760,1400000,1261400
D03,Enterprise Apps,2026-04,11.50,10.00,1410000,1247850,1420000,1278000
```

- [ ] **Step 17.2: Create `public/data/samples/resources-sample.csv`**

```csv
resource_id,division_id,role,month,allocation_status,allocation_percentage
R0101,D01,Senior Engineer,2026-02,Non-Allocated,0
R0101,D01,Senior Engineer,2026-03,Non-Allocated,0
R0101,D01,Senior Engineer,2026-04,Non-Allocated,0
R0102,D01,Engineer,2026-02,Allocated,80
R0102,D01,Engineer,2026-03,Allocated,75
R0102,D01,Engineer,2026-04,Allocated,70
R0201,D02,Senior Engineer,2026-02,Allocated,95
R0201,D02,Senior Engineer,2026-03,Allocated,90
R0201,D02,Senior Engineer,2026-04,Allocated,90
R0301,D03,Engineer,2026-02,Allocated,80
R0301,D03,Engineer,2026-03,Allocated,80
R0301,D03,Engineer,2026-04,Allocated,80
```

- [ ] **Step 17.3: Commit**

```bash
git add public/data/samples/
git commit -m "feat(data): add sample CSVs in public/data/samples/"
```

---

## Task 18: Data Module page

**Files:**
- Create: `app/data/page.tsx`

- [ ] **Step 18.1: Create `app/data/page.tsx`**

```tsx
// app/data/page.tsx
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
          your browser and replaces the seeded mock data on every dashboard.
          {" "}
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
          onFile={(text, fileName) => setPnlResult({ result: parsePnLCsv(text), fileName })}
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
```

- [ ] **Step 18.2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`. The route table now includes `/data`.

- [ ] **Step 18.3: Commit**

```bash
git add app/data/page.tsx
git commit -m "feat(ui): add Data Module upload page with apply and reset"
```

---

## Task 19: Acceptance verification

**Files:** none modified — end-to-end check.

- [ ] **Step 19.1: Run full test suite**

Run: `npm test`
Expected: 8 test files pass — `risk`, `optimization`, `flags`, `recommendations`, `mock-data`, `parsers`, `derive`, `store` — all green.

- [ ] **Step 19.2: Run acceptance script**

Run: `npx tsx scripts/acceptance-check.ts`
Expected: prints risk table and `All acceptance checks PASSED`.

- [ ] **Step 19.3: Run production build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; `Compiled successfully` with `/`, `/resources`, `/resources/[divisionId]`, `/alerts`, `/data` all listed.

- [ ] **Step 19.4: Manual UI smoke test**

Run: `npm run dev`. In a browser, visit `http://localhost:3000` and walk through the spec's acceptance criteria:

1. Header shows nav: Risk Dashboard / Optimization / Alerts / Data, plus "Mock data" badge on the right.
2. Visit `/data`. Drop `public/data/samples/pnl-sample.csv` into the PnL zone. Expect green "✓ pnl-sample.csv — loaded 9 rows" and a JSON preview. Click "Apply PnL".
3. Header badge flips to "Custom data".
4. Visit `/`. Risk Dashboard now shows three rows (Cloud Services, Data & AI, Enterprise Apps) with risk computed from the uploaded data.
5. Back to `/data`. Drop `public/data/samples/resources-sample.csv` into the Resources zone. Apply.
6. Visit `/resources`. Optimization table now shows the three uploaded divisions with derived headcount.
7. Visit `/resources/D01`. Detail page shows R0101 at top with streak ≥ 3.
8. Manually edit `pnl-sample.csv` to introduce one bad row (`D01,Cloud,2026-04,abc,3.4,...`). Re-drop. Expect error report with line number and value `abc`. Apply button hidden.
9. Manually delete the `gm_forecast_pct` column from a copy of `pnl-sample.csv`. Re-drop. Expect "Missing column: gm_forecast_pct".
10. Click "Reset to mock data". Badge returns to "Mock data". Dashboards show the original 5-division mock dataset.

Stop the dev server.

- [ ] **Step 19.5: No additional commit needed.** If any fix was made during 19.4, that fix is its own commit with a descriptive message.

---

## Self-review notes for the implementer

- **Spec coverage:** Every section of the spec maps to at least one task. §3 (architecture, all-client) → tasks 9-12. §4 (CSV schemas) → tasks 4, 5. §5 (validation) → tasks 4, 5. §6.1 (`/data` page) → task 18. §6.2 (header badge + nav) → tasks 13, 14. §6.3 (`dataset-changed` event) → tasks 7, 8. §7 (file map) → tasks 1, 13-18. §8 (data flow) → tasks 4, 5, 7, 8, 18. §9 (deps) → task 2. §10 (acceptance criteria) → task 19.
- **Type consistency:** `Dataset`, `ImportResult<T>`, `ImportError`, `ResourceMonth`, `DivisionPnL`, `Division`, `HeadcountSnapshot`, `Month` are defined once and consumed by exact name everywhere. `DATASET_CHANGED_EVENT` is the single event-name constant.
- **TDD discipline:** Tasks 4, 5, 6, 7 are red-green-commit. Tasks 8 and 13-16 are TS-only / UI components and rely on `tsc --noEmit` + the build for verification. Tasks 9-12 are refactors verified via `npm run build`. Task 19 is the integration gate.
- **Sequencing rationale:** Move JSON first (task 1) so the seed fetch URL works. Install deps (task 2), then types (task 3) before parsers. Logic modules (4-7) before the hook (8). Hook before page refactors (9-12). Atoms (13-16) and samples (17) before the upload page (18) that consumes them. Acceptance (19) last.
