# Data Module — MVP Design

- **Date:** 2026-04-25
- **Status:** Approved (proceeding to implementation plan)
- **Audience:** Engineering (extends the Resource Optimization MVP)
- **Builds on:** [2026-04-25-resource-optimization-design.md](./2026-04-25-resource-optimization-design.md)

## 1. Objective

Add a **Data Module** that lets Finance upload their own PnL and resource-allocation data via CSV, validate it, and have all existing dashboards (Risk Dashboard, Optimization Table, Resource Detail, Alerts) reflect the uploaded dataset. Mock JSON remains as the seed/fallback. No backend, no database.

## 2. Scope

**In scope:**

- `/data` page with two CSV upload zones (PnL, Resources) plus a "Reset to mock data" action
- CSV parsing + validation (row-level errors, cross-file warnings)
- Browser-side persistence via `localStorage`
- Refactor existing pages to read from a unified `useDataset()` hook so they reflect uploaded data automatically
- Header badge indicating "Mock data" vs "Custom data"
- Move seed JSON from `/data/` to `/public/data/` so the browser can fetch the fallback

**Out of scope (MVP):**

- XLSX upload (CSV only)
- In-app cell editing or per-row tweaks
- Multi-user / multi-tenant separation
- Server-side persistence or API routes
- Undo / version history
- Export decisions
- Authentication

## 3. Architecture

**Pattern:** all-client. Pages convert from Server Components to Client Components. Pure-TS lib modules already work in the browser unchanged.

**Data lookup order (`useDataset()`):**

1. `localStorage` (uploaded dataset) — if present and valid
2. Seed JSON fetched from `/public/data/*.json` — fallback

**Why:** keeps a single data path. The dashboards never need to know whether the data is mock or uploaded — they just consume `useDataset()`.

**Trade-offs:**

- Lose SSR for the dashboard pages (they hydrate client-side). Acceptable for an internal Finance tool with no SEO need and < 2k records.
- The seed JSON is shipped statically from `/public/`. Acceptance script (`scripts/acceptance-check.ts`) and the `tests/mock-data.test.ts` keep reading from disk; only the path changes (`/data/` → `/public/data/`).

## 4. CSV schemas

Headers required, order doesn't matter, header row required. UTF-8, comma-separated, double-quote string escaping (PapaParse defaults).

### 4.1 `pnl.csv`

| Column | Type | Required | Notes |
|---|---|---|---|
| `division_id` | string | ✓ | e.g. `D01` |
| `division_name` | string | optional | falls back to `division_id` |
| `month` | `YYYY-MM` | ✓ | e.g. `2026-04` |
| `gm_actual_pct` | number | ✓ | percent value, e.g. `15.2` |
| `gm_forecast_pct` | number | ✓ | percent value |
| `revenue_actual` | number | optional | shown in KPI cards if present |
| `cost_actual` | number | optional | as above |
| `revenue_forecast` | number | optional | as above |
| `cost_forecast` | number | optional | as above |

### 4.2 `resources.csv`

| Column | Type | Required |
|---|---|---|
| `resource_id` | string | ✓ |
| `division_id` | string | ✓ |
| `role` | string | ✓ |
| `month` | `YYYY-MM` | ✓ |
| `allocation_status` | `Allocated` \| `Non-Allocated` | ✓ |
| `allocation_percentage` | integer 0–100 | ✓ |

### 4.3 Derived datasets

`divisions` and `headcount` are derived after upload — no third file:

- **`divisions`** = unique `(division_id, division_name)` from PnL.
- **`headcount`** per `(division_id, month)`:
  - `total_headcount` = count of distinct `resource_id` in Resources for that division/month
  - `by_role` = group-count of `role` across those rows

If revenue/cost are missing in PnL, KPI cards that depend on them are hidden gracefully; risk computation does not need them (only `gm_*_pct`).

## 5. Validation rules

Two passes per file. The UI surfaces both:

**Pass 1 — schema (blocking):**

- All required columns present in header row → otherwise reject with "Missing column: X" and full required-list reminder.

**Pass 2 — per row (blocking when any error):**

- Numeric columns parse as finite numbers
- `month` matches `^\d{4}-(0[1-9]|1[0-2])$`
- `allocation_status` ∈ `{Allocated, Non-Allocated}`
- `allocation_percentage` ∈ `[0, 100]`
- No duplicate `(division_id, month)` in PnL
- No duplicate `(resource_id, month)` in Resources

**Pass 3 — cross-file (warnings only, non-blocking):**

- Resource rows whose `division_id` is not in PnL → warning, listed but allowed

**Result shape (`ImportResult<T>`):**

```ts
type ImportError = { line: number; column?: string; message: string; raw?: string };
type ImportResult<T> = {
  data: T[];        // empty if errors length > 0
  errors: ImportError[];
  warnings: ImportError[];
};
```

## 6. UI

### 6.1 `/data` page

Two stacked sections — PnL upload and Resources upload — each with:

- A drop zone (also clickable for file picker)
- After file selected: parse + validate immediately
- Result panel: green "✓ Loaded N rows" + 5-row preview, OR red "✗ N errors" with line numbers and raw values
- "Apply" button — disabled if errors > 0; on click writes to `localStorage` and shows a success toast
- Below both sections: small "Reset to mock data" button (clears `localStorage`, reloads page)

### 6.2 Header changes

- New nav link "Data" → `/data`
- Right-aligned **DatasetBadge**: pill that reads "Mock data" (slate) or "Custom data" (sky), based on whether `localStorage` has any uploaded set

### 6.3 Page behavior on upload

After clicking Apply, the `/data` page dispatches a custom `dataset-changed` event on `window`. `useDataset()` subscribes to both:

- the native `storage` event (fires in *other* tabs), and
- the custom `dataset-changed` event (fires in the *same* tab).

This lets the user navigate to a dashboard and see the new data without a manual reload. Apply also triggers a brief success toast and stays on `/data`.

## 7. New / changed files

```
/lib/
  store.ts          NEW    typed localStorage accessors (get/set/clear/subscribe)
  parsers.ts        NEW    parsePnLCsv, parseResourcesCsv → ImportResult
  derive.ts         NEW    deriveDivisions(pnl), deriveHeadcount(resources)
  useDataset.ts     NEW    client hook returning unified dataset + isCustom flag
  data.ts           CHG    fs-based reader: /data/ → /public/data/

/app/
  layout.tsx        CHG    add "Data" nav link + <DatasetBadge/>
  page.tsx          CHG    'use client', read via useDataset()
  resources/page.tsx               CHG  same pattern
  resources/[divisionId]/page.tsx  CHG  same pattern
  alerts/page.tsx                  CHG  same pattern
  data/page.tsx     NEW    upload UI page

/components/
  CsvDropzone.tsx   NEW    file input / drop target
  ImportReport.tsx  NEW    error table + sample preview
  DatasetBadge.tsx  NEW    header pill
  RecommendationLabel.tsx  CHG  no change to logic; existing inline component stays

/public/data/       MOVED  from /data/  (divisions.json, pnl.json, resources.json, headcount.json)

/scripts/
  acceptance-check.ts  CHG  read from /public/data/

/tests/
  parsers.test.ts        NEW   schema, row, duplicate, status enum, range tests
  derive.test.ts         NEW   divisions/headcount derivation tests
  store.test.ts          NEW   localStorage round-trip (using a stub)
  mock-data.test.ts      CHG  read from /public/data/

package.json        CHG  add papaparse and @types/papaparse
```

## 8. Data flow

```
[user drops pnl.csv]
   ↓
CsvDropzone reads File → text
   ↓
parsers.parsePnLCsv(text) → ImportResult<DivisionPnL>
   ↓
ImportReport renders preview + errors/warnings
   ↓ (Apply clicked)
store.setPnL(data) → localStorage["dataset.pnl"]
   ↓
useDataset() detects change, re-derives divisions + headcount
   ↓
all pages recompute risk, candidates, alerts
   ↓
DatasetBadge flips to "Custom data"
```

## 9. Dependencies added

- `papaparse` ^5.4.x
- `@types/papaparse` ^5.3.x (dev)

No new test framework, no chart library changes, no auth.

## 10. Acceptance criteria

1. Drop a valid `pnl.csv` and `resources.csv` (sample provided in `public/data/samples/`); both Apply buttons enable and writing succeeds.
2. After applying, the Risk Dashboard shows the uploaded division names and updated risk classification within one navigation.
3. Drop a `pnl.csv` with one bad row (e.g. `gm_actual_pct = "abc"`); the UI shows that single error with the correct line number and disables Apply.
4. Drop a `pnl.csv` missing the `gm_forecast_pct` column; the UI shows "Missing column: gm_forecast_pct" and disables Apply.
5. Click "Reset to mock data"; `localStorage` clears, badge returns to "Mock data", dashboards reflect the seeded mock.
6. All existing tests pass after the `/data/` → `/public/data/` move; new tests for `parsers`, `derive`, and `store` all pass.

## 11. Assumptions

- A single Finance user runs the app on their own laptop. No multi-user data isolation.
- Browser supports `localStorage` (any modern browser does; we don't fall back).
- CSV uploads are full replacements for that file's dataset (no merging into existing data).
- "Reset to mock data" reverts both PnL and Resources together — no per-file reset.
- localStorage size is sufficient (~5MB typical). For ~150 resources × 12 months, expected payload < 200KB.

## 12. Next steps

1. Invoke `superpowers:writing-plans` skill to produce a step-by-step implementation plan.
2. Build order (preview): move seed JSON → store + parsers + derive (with tests) → useDataset hook → page client-component refactor → /data page UI → DatasetBadge + nav.
