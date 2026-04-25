# Resource Optimization (Finance-driven) — MVP Design

- **Date:** 2026-04-25
- **Status:** Approved (awaiting implementation plan)
- **Owner:** Finance
- **Audience:** Engineering (MVP build)

## 1. Objective

A read-only analytics application that helps Finance optimize resource allocation across divisions, driven by Gross Margin performance (Actual + Forecast) and resource utilization trends.

The MVP answers three questions per division:

1. How financially healthy is the division? (Risk classification)
2. How much headcount should be optimized? (Target % and count)
3. Which specific resources are the candidates? (Ranked list with recommended action)

## 2. Scope

**In scope (MVP):**

- Division-level risk classification from PnL data
- Resource-level candidate selection from allocation data
- Recommendations: Keep / Reallocate / Upskill / Optimize
- Trend-based inefficiency flags (idle resources, rising bench)
- 4 read-only pages backed by mock JSON

**Out of scope (MVP):**

- Authentication / multi-tenancy
- Editing or overriding allocations from the UI
- Persisting accept/reject decisions
- "What-if" scenario modeling
- Cross-division demand-matching beyond a simple role lookup
- Export to Excel / PDF
- Real database or API integration

## 3. Architecture

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Recharts.

**Pattern:** All-local. Mock JSON in `/data/`, loaded by Server Components. Pure TypeScript modules in `/lib/` perform classification, candidate selection, and flag computation. No API routes, no database, no client-side state beyond chart hydration.

**Why this shape:**

- Computation is transparent and deterministic — easy to validate against Finance's hand-calculations.
- Logic in `/lib` can be promoted to API routes in v2 with no rewrite.
- Each module has one responsibility and can be unit-tested in isolation.

## 4. Repo layout

```
/data/
  divisions.json
  pnl.json
  resources.json
  headcount.json
/lib/
  types.ts          # shared interfaces
  risk.ts           # GM blending, trend slope, risk classification
  optimization.ts   # candidate selection, target HC math
  flags.ts          # idle/rising-bench/extreme-risk flags
  recommendations.ts # per-resource action selection
/app/
  page.tsx                          # Page 1 — Division Risk Dashboard
  resources/page.tsx                # Page 2 — Optimization Table
  resources/[divisionId]/page.tsx   # Page 3 — Resource Detail
  alerts/page.tsx                   # Page 4 — Alerts
/components/
  RiskBadge.tsx
  KpiCard.tsx
  GmBarChart.tsx
  AllocationSparkline.tsx
  DivisionTable.tsx
  ResourceTable.tsx
/scripts/
  generate-mock.ts                  # seed: 5 divisions × 6 months × ~150 resources
```

## 5. Data model

All amounts in a single currency (USD assumed). Months are ISO `YYYY-MM` strings.

### 5.1 `divisions.json`

```ts
type Division = {
  division_id: string;   // e.g. "D01"
  name: string;          // e.g. "Cloud Services"
};
```

### 5.2 `pnl.json` — one row per division × month

```ts
type DivisionPnL = {
  division_id: string;
  month: string;                 // "YYYY-MM"
  revenue_actual: number;
  cost_actual: number;
  gm_actual_pct: number;         // pre-computed: (rev - cost) / rev * 100
  revenue_forecast: number;
  cost_forecast: number;
  gm_forecast_pct: number;
};
```

`gm_*_pct` is stored (not derived on the fly) so the JSON matches what Finance produces in their spreadsheets.

### 5.3 `resources.json` — one row per resource × month

```ts
type ResourceMonth = {
  resource_id: string;           // e.g. "R0117"
  division_id: string;
  role: string;                  // e.g. "Senior Engineer"
  month: string;
  allocation_status: "Allocated" | "Non-Allocated";
  allocation_percentage: number; // 0..100
};
```

A resource appears once per month they exist, even if Non-Allocated.

### 5.4 `headcount.json` — precomputed snapshot per division × month

```ts
type HeadcountSnapshot = {
  division_id: string;
  month: string;
  total_headcount: number;
  by_role: Record<string, number>;
};
```

Stored explicitly even though derivable from `resources.json` — keeps Finance's reported HC as the source of truth for target-optimization math (handles partial-month joiners/leavers cleanly).

## 6. Core logic

All computation runs against a single `as_of_month` (default: latest month present in `pnl.json`). The "last 3 months" window is `[as_of - 2, as_of - 1, as_of]`.

### 6.1 Risk classification — `lib/risk.ts`

**Inputs (per division, at `as_of_month`):** `gm_actual_pct`, `gm_forecast_pct`, plus `gm_actual_pct` for the prior 2 months.

**Step 1 — Blended GM:**

```
gm_blended = 0.4 × gm_actual_pct + 0.6 × gm_forecast_pct
```

Forecast is weighted higher because optimization decisions act on forward-looking margin.

**Step 2 — Trend (last 3 months):**

```
trend_3mo = linear regression slope of [gm_actual_pct(m-2), gm_actual_pct(m-1), gm_actual_pct(m)]
```

If fewer than 3 months exist, treat trend as 0.

**Step 3 — Risk band:**

| `gm_blended` band | `trend_3mo` | Risk |
|---|---|---|
| `>= 25` | any | Safe |
| `18..25` | `>= 0` | Safe |
| `18..25` | `< 0` | Low |
| `12..18` | `>= 0` | Low |
| `12..18` | `< 0` | Medium |
| `6..12` | `>= 0` | Medium |
| `6..12` | `< 0` | High |
| `0..6` | any | High |
| `< 0` | any | Extreme |

(Bands are inclusive of lower bound, exclusive of upper bound, except the top bucket.)

### 6.2 Optimization % — `lib/optimization.ts`

| Risk | Stated range | MVP compute % |
|---|---|---|
| Safe | 0–2% | 0% (no candidates surfaced) |
| Low | 3–5% | 4% (midpoint) |
| Medium | 5–10% | 7.5% (midpoint) |
| High | 10–20% | 15% (midpoint) |
| Extreme | 20–30% | 25% (midpoint) |

For Safe we deliberately compute **0%** rather than a midpoint of `~1%` — Finance has indicated a healthy division should not generate any forced-optimization noise. The 0–2% range is preserved here for documentation; future versions may expose it as a tuning knob.

**Target headcount to optimize:**

```
target_opt_count = ceil(total_headcount × opt_pct)
```

`total_headcount` is taken from `headcount.json` for the `as_of_month`.

### 6.3 Candidate selection — `lib/optimization.ts`

For each resource currently in the division at `as_of_month`, compute:

- `non_allocated_streak` = number of consecutive trailing months ending at `as_of_month` with `allocation_status = "Non-Allocated"`. Range: 0..N.
- `utilization_score` = arithmetic mean of `allocation_percentage` across the last 3 months (or fewer if newer hire).

Sort the resource pool DESC by `non_allocated_streak`, then ASC by `utilization_score`. Take the top `target_opt_count` rows — these are the suggested resources.

Tie-break (after the two main keys): roles whose `by_role` count exceeds the division's median come first (over-staffed roles get pruned before specialists).

### 6.4 Inefficiency flags — `lib/flags.ts`

**Resource-level:**

- `non_allocated_streak >= 2` → `"Idle 2+ months"`
- `non_allocated_streak >= 3` → `"Idle 3+ months — high priority"` (supersedes the 2-month flag)

**Division-level:**

- Count of Non-Allocated resources strictly increased in each of the last 3 months → `"Rising bench"`
- Risk = Extreme → `"Extreme risk"`

### 6.5 Recommendation engine — `lib/recommendations.ts`

Applied to every resource (not just the candidate pool). First match wins:

| # | Condition | Recommendation |
|---|---|---|
| 1 | `streak >= 3` AND division risk ∈ {High, Extreme} | **Optimize** |
| 2 | `streak >= 1` AND another division has `role_demand` for the same role | **Reallocate** |
| 3 | `utilization_score < 50` | **Upskill / Reallocate** |
| 4 | otherwise | **Keep** |

**`role_demand` in MVP** is a deterministic check: another division qualifies as having demand for `role` if it satisfies *both*

- the division's risk level is **Safe or Low** (it's healthy enough to absorb HC), AND
- the average `allocation_percentage` of that role within that division at `as_of_month` is `>= 85%` (existing role-holders are saturated).

If no division qualifies, rule 2 does not match and we fall through. This keeps the rule deterministic, JSON-only, and unit-testable without a separate "demand signal" data source.

## 7. Pages

### 7.1 Page 1 — Division Risk Dashboard (`/`)

- KPI strip (top): Total divisions · Divisions at High+ risk · Total target optimization HC
- Table columns: Division · GM Actual · GM Forecast · GM Blended · Trend (3mo) · Risk badge · Opt % · Target Opt HC
- Bar chart: GM Actual vs Forecast by division (Recharts grouped bars)
- Click row → navigates to `/resources/[divisionId]`

### 7.2 Page 2 — Resource Optimization Table (`/resources`)

Columns: Division · Total HC · Non-Allocated HC · Target Opt HC · Top Suggested Action (free-text summary, e.g. "Optimize 4 idle, reallocate 2").

### 7.3 Page 3 — Resource Detail (`/resources/[divisionId]`)

- Header: division name, risk badge, opt % / target HC
- Table: Resource ID · Role · Allocation last 3mo (sparkline) · Streak · Avg Util · Recommendation
- Sorted with candidate pool at the top

### 7.4 Page 4 — Alerts (`/alerts`)

Flat list grouped by division. Each row: severity icon · flag text · affected resource_ids (where applicable).

## 8. Sample output

> **Cloud Services (D01)** — GM Actual 8.4%, Forecast 6.2%, trend −1.1%/mo → **Risk: High**, Opt 15% → target **7 of 42** HC. Non-allocated: 5.
> Top candidates: R0117 (idle 3mo, Sr Eng) → **Optimize** · R0204 (idle 2mo, Eng) → **Reallocate** · R0233 (util 35%, PM) → **Upskill / Reallocate**.

## 9. Mock data generator

`scripts/generate-mock.ts` seeds:

- 5 divisions with intentionally varied health (one Safe, one Low, one Medium, one High, one Extreme — so every code path is exercised on first load)
- 6 months of PnL ending at `as_of_month = "2026-04"`
- ~150 resources across divisions, with realistic role mix and a deliberate planted set of multi-month idle resources

Re-runnable, deterministic with a fixed seed.

## 10. Acceptance criteria

The MVP is done when:

1. All 4 pages render with the seeded mock data without runtime errors.
2. Risk classification matches a hand-calculated reference for the 5 seeded divisions.
3. Candidate selection for each division returns exactly `target_opt_count` resources, sorted per §6.3.
4. The seeded "planted idle" resources surface in the Idle 3+ months alert.
5. `lib/*` modules each have unit tests covering: empty input, single-month input, normal multi-month input, all five risk bands.

## 11. Assumptions

- All divisions report in the same currency.
- A resource belongs to exactly one division per month (no shared / split assignments in MVP).
- `headcount.total_headcount` is the authoritative HC count, not derived from `resources.json`.
- `as_of_month` defaults to the latest month present in `pnl.json`; not user-selectable in MVP.
- "Trend" uses `gm_actual_pct` only (not blended), because trend is meant to detect realized direction.

## 12. Next steps

1. User review of this spec.
2. Invoke the `superpowers:writing-plans` skill to produce a step-by-step implementation plan.
3. Build order (preview, finalized in the plan): types → mock generator → `risk.ts` (with tests) → `optimization.ts` (with tests) → `flags.ts` / `recommendations.ts` → pages.
