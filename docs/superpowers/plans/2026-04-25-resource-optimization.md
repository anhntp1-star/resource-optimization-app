# Resource Optimization (Finance-driven) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Next.js MVP that classifies divisions by financial risk, computes target optimization headcount, and surfaces ranked resource candidates with recommendations — all from local mock JSON.

**Architecture:** Next.js 14 App Router with Server Components reading mock JSON from `/data/`. Pure TypeScript modules in `/lib/` perform every computation (risk classification, candidate selection, flags, recommendations). No API routes, no DB, no auth. Vitest for unit tests on logic modules. Recharts for visuals.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Vitest, Node 20+.

**Reference spec:** [docs/superpowers/specs/2026-04-25-resource-optimization-design.md](../specs/2026-04-25-resource-optimization-design.md)

---

## File map

**Created in this plan:**

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx` | Project scaffold |
| `lib/types.ts` | Shared TypeScript interfaces |
| `lib/risk.ts` | GM blending, trend slope, risk classification |
| `lib/optimization.ts` | Optimization %, target HC, candidate selection |
| `lib/flags.ts` | Idle / rising-bench / extreme-risk flag detection |
| `lib/recommendations.ts` | Role-demand lookup, per-resource action |
| `lib/views.ts` | Aggregates raw JSON + lib outputs into per-page view models |
| `lib/data.ts` | Loads + parses the four JSON files (single source for pages) |
| `scripts/generate-mock.ts` | Deterministic mock-data generator (5 divisions × 6 months × ~150 resources) |
| `data/divisions.json`, `data/pnl.json`, `data/resources.json`, `data/headcount.json` | Mock datasets (output of generator) |
| `tests/risk.test.ts`, `tests/optimization.test.ts`, `tests/flags.test.ts`, `tests/recommendations.test.ts`, `tests/mock-data.test.ts` | Unit tests |
| `components/RiskBadge.tsx`, `KpiCard.tsx`, `GmBarChart.tsx`, `AllocationSparkline.tsx`, `DivisionTable.tsx`, `ResourceTable.tsx` | UI atoms |
| `app/page.tsx` | Page 1 — Division Risk Dashboard |
| `app/resources/page.tsx` | Page 2 — Resource Optimization Table |
| `app/resources/[divisionId]/page.tsx` | Page 3 — Resource Detail |
| `app/alerts/page.tsx` | Page 4 — Alerts |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`

- [ ] **Step 1.1: Create `package.json`**

```json
{
  "name": "resource-optimization",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate:mock": "tsx scripts/generate-mock.ts"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "recharts": "2.12.7"
  },
  "devDependencies": {
    "@types/node": "20.14.10",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.39",
    "tailwindcss": "3.4.6",
    "tsx": "4.16.2",
    "typescript": "5.5.3",
    "vitest": "2.0.3"
  }
}
```

- [ ] **Step 1.2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 1.3: Create `next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
```

- [ ] **Step 1.4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 1.5: Create `postcss.config.js`**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 1.6: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 1.7: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-slate-50 text-slate-900; }
```

- [ ] **Step 1.8: Create `app/layout.tsx`**

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = { title: "Resource Optimization" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-7xl gap-6 px-6 py-4 text-sm font-medium">
            <Link href="/">Risk Dashboard</Link>
            <Link href="/resources">Optimization</Link>
            <Link href="/alerts">Alerts</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 1.9: Install dependencies**

Run: `npm install`
Expected: completes without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 1.10: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 1.11: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.js tailwind.config.ts postcss.config.js vitest.config.ts app/globals.css app/layout.tsx
git commit -m "chore: scaffold Next.js + Tailwind + Vitest project"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 2.1: Create `lib/types.ts`**

```ts
export type Month = string; // "YYYY-MM"

export type Division = {
  division_id: string;
  name: string;
};

export type DivisionPnL = {
  division_id: string;
  month: Month;
  revenue_actual: number;
  cost_actual: number;
  gm_actual_pct: number;
  revenue_forecast: number;
  cost_forecast: number;
  gm_forecast_pct: number;
};

export type AllocationStatus = "Allocated" | "Non-Allocated";

export type ResourceMonth = {
  resource_id: string;
  division_id: string;
  role: string;
  month: Month;
  allocation_status: AllocationStatus;
  allocation_percentage: number;
};

export type HeadcountSnapshot = {
  division_id: string;
  month: Month;
  total_headcount: number;
  by_role: Record<string, number>;
};

export type RiskLevel = "Safe" | "Low" | "Medium" | "High" | "Extreme";

export type Recommendation = "Keep" | "Reallocate" | "Upskill / Reallocate" | "Optimize";

export type ResourceFlag = "Idle 2+ months" | "Idle 3+ months — high priority";
export type DivisionFlag = "Rising bench" | "Extreme risk";
```

- [ ] **Step 2.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 2.3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add shared interfaces for divisions, PnL, resources, headcount"
```

---

## Task 3: Risk classification module

**Files:**
- Create: `tests/risk.test.ts`
- Create: `lib/risk.ts`

- [ ] **Step 3.1: Write failing tests for `lib/risk.ts`**

```ts
// tests/risk.test.ts
import { describe, it, expect } from "vitest";
import { computeBlendedGm, computeTrend, classifyRisk } from "@/lib/risk";

describe("computeBlendedGm", () => {
  it("weights forecast at 0.6 and actual at 0.4", () => {
    expect(computeBlendedGm(10, 20)).toBeCloseTo(16, 6);
  });
  it("returns 0 when both inputs are 0", () => {
    expect(computeBlendedGm(0, 0)).toBe(0);
  });
  it("handles negatives", () => {
    expect(computeBlendedGm(-10, -20)).toBeCloseTo(-16, 6);
  });
});

describe("computeTrend", () => {
  it("returns 0 for fewer than 3 values", () => {
    expect(computeTrend([])).toBe(0);
    expect(computeTrend([5])).toBe(0);
    expect(computeTrend([5, 6])).toBe(0);
  });
  it("returns positive slope for rising values", () => {
    expect(computeTrend([10, 12, 14])).toBeCloseTo(2, 6);
  });
  it("returns negative slope for falling values", () => {
    expect(computeTrend([14, 12, 10])).toBeCloseTo(-2, 6);
  });
  it("returns 0 for flat values", () => {
    expect(computeTrend([10, 10, 10])).toBe(0);
  });
});

describe("classifyRisk", () => {
  // Helper: history of 3 flat values means trend = 0
  const flat = (v: number) => [v, v, v];

  it("Safe when blended >= 25", () => {
    expect(classifyRisk(30, 30, flat(30))).toBe("Safe");
  });
  it("Safe when blended in [18,25) and trend >= 0", () => {
    expect(classifyRisk(20, 20, flat(20))).toBe("Safe");
  });
  it("Low when blended in [18,25) and trend < 0", () => {
    expect(classifyRisk(20, 20, [22, 21, 20])).toBe("Low");
  });
  it("Low when blended in [12,18) and trend >= 0", () => {
    expect(classifyRisk(15, 15, flat(15))).toBe("Low");
  });
  it("Medium when blended in [12,18) and trend < 0", () => {
    expect(classifyRisk(15, 15, [17, 16, 15])).toBe("Medium");
  });
  it("Medium when blended in [6,12) and trend >= 0", () => {
    expect(classifyRisk(10, 10, flat(10))).toBe("Medium");
  });
  it("High when blended in [6,12) and trend < 0", () => {
    expect(classifyRisk(10, 10, [12, 11, 10])).toBe("High");
  });
  it("High when blended in [0,6) regardless of trend", () => {
    expect(classifyRisk(3, 3, flat(3))).toBe("High");
    expect(classifyRisk(3, 3, [5, 4, 3])).toBe("High");
  });
  it("Extreme when blended < 0", () => {
    expect(classifyRisk(-2, -2, flat(-2))).toBe("Extreme");
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `npm test -- tests/risk.test.ts`
Expected: FAIL — `Cannot find module '@/lib/risk'` or similar.

- [ ] **Step 3.3: Implement `lib/risk.ts`**

```ts
// lib/risk.ts
import type { RiskLevel } from "@/lib/types";

export function computeBlendedGm(gmActualPct: number, gmForecastPct: number): number {
  return 0.4 * gmActualPct + 0.6 * gmForecastPct;
}

export function computeTrend(values: number[]): number {
  if (values.length < 3) return 0;
  const n = values.length;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function classifyRisk(
  gmActualPct: number,
  gmForecastPct: number,
  gmActualHistory: number[],
): RiskLevel {
  const blended = computeBlendedGm(gmActualPct, gmForecastPct);
  const trend = computeTrend(gmActualHistory);

  if (blended < 0) return "Extreme";
  if (blended < 6) return "High";
  if (blended < 12) return trend < 0 ? "High" : "Medium";
  if (blended < 18) return trend < 0 ? "Medium" : "Low";
  if (blended < 25) return trend < 0 ? "Low" : "Safe";
  return "Safe";
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `npm test -- tests/risk.test.ts`
Expected: all tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add tests/risk.test.ts lib/risk.ts
git commit -m "feat(risk): add GM blending, trend slope, and risk classification"
```

---

## Task 4: Optimization module

**Files:**
- Create: `tests/optimization.test.ts`
- Create: `lib/optimization.ts`

- [ ] **Step 4.1: Write failing tests for `lib/optimization.ts`**

```ts
// tests/optimization.test.ts
import { describe, it, expect } from "vitest";
import {
  getOptimizationPct,
  computeTargetCount,
  computeUtilizationScore,
  computeNonAllocatedStreak,
  selectCandidates,
} from "@/lib/optimization";
import type { ResourceMonth } from "@/lib/types";

const r = (month: string, status: "Allocated" | "Non-Allocated", pct: number, id = "R1", role = "Eng"): ResourceMonth => ({
  resource_id: id,
  division_id: "D01",
  role,
  month,
  allocation_status: status,
  allocation_percentage: pct,
});

describe("getOptimizationPct", () => {
  it("Safe -> 0", () => expect(getOptimizationPct("Safe")).toBe(0));
  it("Low -> 0.04", () => expect(getOptimizationPct("Low")).toBe(0.04));
  it("Medium -> 0.075", () => expect(getOptimizationPct("Medium")).toBe(0.075));
  it("High -> 0.15", () => expect(getOptimizationPct("High")).toBe(0.15));
  it("Extreme -> 0.25", () => expect(getOptimizationPct("Extreme")).toBe(0.25));
});

describe("computeTargetCount", () => {
  it("uses ceil", () => {
    expect(computeTargetCount(42, 0.15)).toBe(7); // 6.3 -> 7
  });
  it("returns 0 when pct is 0", () => {
    expect(computeTargetCount(42, 0)).toBe(0);
  });
});

describe("computeUtilizationScore", () => {
  it("averages allocation_percentage across the last 3 months", () => {
    const months = [
      r("2026-02", "Allocated", 100),
      r("2026-03", "Allocated", 80),
      r("2026-04", "Allocated", 60),
    ];
    expect(computeUtilizationScore(months, "2026-04")).toBeCloseTo(80, 6);
  });
  it("averages over fewer months when newer hire", () => {
    const months = [r("2026-04", "Allocated", 50)];
    expect(computeUtilizationScore(months, "2026-04")).toBe(50);
  });
  it("returns 0 when no months in window", () => {
    expect(computeUtilizationScore([], "2026-04")).toBe(0);
  });
});

describe("computeNonAllocatedStreak", () => {
  it("returns 3 when last 3 months are Non-Allocated", () => {
    const months = [
      r("2026-02", "Non-Allocated", 0),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Non-Allocated", 0),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(3);
  });
  it("returns 0 when as_of month is Allocated", () => {
    const months = [
      r("2026-02", "Non-Allocated", 0),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Allocated", 100),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(0);
  });
  it("counts only trailing consecutive Non-Allocated", () => {
    const months = [
      r("2026-01", "Non-Allocated", 0),
      r("2026-02", "Allocated", 100),
      r("2026-03", "Non-Allocated", 0),
      r("2026-04", "Non-Allocated", 0),
    ];
    expect(computeNonAllocatedStreak(months, "2026-04")).toBe(2);
  });
});

describe("selectCandidates", () => {
  it("returns target_opt_count resources sorted by streak desc, util asc", () => {
    const resources: ResourceMonth[] = [
      // R1: streak 3, util 0
      r("2026-02", "Non-Allocated", 0, "R1"),
      r("2026-03", "Non-Allocated", 0, "R1"),
      r("2026-04", "Non-Allocated", 0, "R1"),
      // R2: streak 0, util 100
      r("2026-02", "Allocated", 100, "R2"),
      r("2026-03", "Allocated", 100, "R2"),
      r("2026-04", "Allocated", 100, "R2"),
      // R3: streak 0, util 30
      r("2026-02", "Allocated", 30, "R3"),
      r("2026-03", "Allocated", 30, "R3"),
      r("2026-04", "Allocated", 30, "R3"),
    ];
    const out = selectCandidates(resources, 2, "2026-04");
    expect(out.map((c) => c.resource_id)).toEqual(["R1", "R3"]);
  });
  it("returns empty array when target is 0", () => {
    expect(selectCandidates([], 0, "2026-04")).toEqual([]);
  });
});
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `npm test -- tests/optimization.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement `lib/optimization.ts`**

```ts
// lib/optimization.ts
import type { Month, ResourceMonth, RiskLevel } from "@/lib/types";

const OPT_PCT: Record<RiskLevel, number> = {
  Safe: 0,
  Low: 0.04,
  Medium: 0.075,
  High: 0.15,
  Extreme: 0.25,
};

export function getOptimizationPct(risk: RiskLevel): number {
  return OPT_PCT[risk];
}

export function computeTargetCount(headcount: number, optPct: number): number {
  return Math.ceil(headcount * optPct);
}

function priorMonths(asOf: Month, count: number): Month[] {
  const [y, m] = asOf.split("-").map(Number);
  const out: Month[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function computeUtilizationScore(months: ResourceMonth[], asOf: Month): number {
  const window = priorMonths(asOf, 3);
  const inWindow = months.filter((m) => window.includes(m.month));
  if (inWindow.length === 0) return 0;
  const sum = inWindow.reduce((a, m) => a + m.allocation_percentage, 0);
  return sum / inWindow.length;
}

export function computeNonAllocatedStreak(months: ResourceMonth[], asOf: Month): number {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].month > asOf) continue;
    if (sorted[i].allocation_status === "Non-Allocated") streak++;
    else break;
  }
  return streak;
}

export type Candidate = {
  resource_id: string;
  role: string;
  streak: number;
  utilization: number;
};

export function selectCandidates(
  resources: ResourceMonth[],
  targetCount: number,
  asOf: Month,
): Candidate[] {
  if (targetCount <= 0) return [];

  const byResource = new Map<string, ResourceMonth[]>();
  for (const r of resources) {
    const list = byResource.get(r.resource_id) ?? [];
    list.push(r);
    byResource.set(r.resource_id, list);
  }

  const candidates: Candidate[] = [];
  for (const [resource_id, list] of byResource) {
    const role = list[list.length - 1]?.role ?? "";
    candidates.push({
      resource_id,
      role,
      streak: computeNonAllocatedStreak(list, asOf),
      utilization: computeUtilizationScore(list, asOf),
    });
  }

  candidates.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.utilization - b.utilization;
  });

  return candidates.slice(0, targetCount);
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `npm test -- tests/optimization.test.ts`
Expected: all tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add tests/optimization.test.ts lib/optimization.ts
git commit -m "feat(optimization): add target HC math, util score, streak, candidate selection"
```

---

## Task 5: Flags module

**Files:**
- Create: `tests/flags.test.ts`
- Create: `lib/flags.ts`

- [ ] **Step 5.1: Write failing tests for `lib/flags.ts`**

```ts
// tests/flags.test.ts
import { describe, it, expect } from "vitest";
import { getResourceFlags, getDivisionFlags } from "@/lib/flags";

describe("getResourceFlags", () => {
  it("returns empty for streak < 2", () => {
    expect(getResourceFlags(0)).toEqual([]);
    expect(getResourceFlags(1)).toEqual([]);
  });
  it("returns 'Idle 2+ months' for streak == 2", () => {
    expect(getResourceFlags(2)).toEqual(["Idle 2+ months"]);
  });
  it("returns only the high-priority flag for streak >= 3", () => {
    expect(getResourceFlags(3)).toEqual(["Idle 3+ months — high priority"]);
    expect(getResourceFlags(5)).toEqual(["Idle 3+ months — high priority"]);
  });
});

describe("getDivisionFlags", () => {
  it("flags 'Rising bench' when non-allocated count strictly increased in each of last 3 months", () => {
    expect(getDivisionFlags("Low", [2, 5, 7, 10])).toContain("Rising bench");
  });
  it("does not flag 'Rising bench' when sequence is flat", () => {
    expect(getDivisionFlags("Low", [5, 5, 5, 5])).not.toContain("Rising bench");
  });
  it("does not flag 'Rising bench' when only 2 months provided", () => {
    expect(getDivisionFlags("Low", [3, 5])).not.toContain("Rising bench");
  });
  it("flags 'Extreme risk' when risk is Extreme", () => {
    expect(getDivisionFlags("Extreme", [1, 1, 1, 1])).toContain("Extreme risk");
  });
  it("returns empty for Safe risk with stable bench", () => {
    expect(getDivisionFlags("Safe", [2, 2, 2, 2])).toEqual([]);
  });
});
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `npm test -- tests/flags.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement `lib/flags.ts`**

```ts
// lib/flags.ts
import type { DivisionFlag, ResourceFlag, RiskLevel } from "@/lib/types";

export function getResourceFlags(streak: number): ResourceFlag[] {
  if (streak >= 3) return ["Idle 3+ months — high priority"];
  if (streak >= 2) return ["Idle 2+ months"];
  return [];
}

export function getDivisionFlags(
  risk: RiskLevel,
  monthlyNonAllocCounts: number[],
): DivisionFlag[] {
  const flags: DivisionFlag[] = [];
  // Need 4 data points to confirm strict increase in each of the last 3 months.
  if (monthlyNonAllocCounts.length >= 4) {
    const tail = monthlyNonAllocCounts.slice(-4);
    const rising = tail[1] > tail[0] && tail[2] > tail[1] && tail[3] > tail[2];
    if (rising) flags.push("Rising bench");
  }
  if (risk === "Extreme") flags.push("Extreme risk");
  return flags;
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `npm test -- tests/flags.test.ts`
Expected: all tests PASS.

- [ ] **Step 5.5: Commit**

```bash
git add tests/flags.test.ts lib/flags.ts
git commit -m "feat(flags): add resource and division inefficiency flags"
```

---

## Task 6: Recommendations module

**Files:**
- Create: `tests/recommendations.test.ts`
- Create: `lib/recommendations.ts`

- [ ] **Step 6.1: Write failing tests for `lib/recommendations.ts`**

```ts
// tests/recommendations.test.ts
import { describe, it, expect } from "vitest";
import { computeRoleDemand, recommendForResource } from "@/lib/recommendations";
import type { ResourceMonth, RiskLevel } from "@/lib/types";

const r = (
  division_id: string,
  role: string,
  pct: number,
  status: "Allocated" | "Non-Allocated" = "Allocated",
  resource_id = `${division_id}-${role}-${Math.random()}`,
): ResourceMonth => ({
  resource_id,
  division_id,
  role,
  month: "2026-04",
  allocation_status: status,
  allocation_percentage: pct,
});

describe("computeRoleDemand", () => {
  it("returns roles in Safe/Low divisions with avg allocation >= 85", () => {
    const resources = [
      // D02 (Safe): Eng saturated
      r("D02", "Eng", 90),
      r("D02", "Eng", 90),
      // D03 (High): Eng under-allocated
      r("D03", "Eng", 40),
    ];
    const riskByDivision: Record<string, RiskLevel> = {
      D02: "Safe",
      D03: "High",
    };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toEqual(["D02"]);
  });
  it("excludes High/Extreme divisions even when saturated", () => {
    const resources = [r("D03", "Eng", 95), r("D03", "Eng", 95)];
    const riskByDivision: Record<string, RiskLevel> = { D03: "High" };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toBeUndefined();
  });
  it("excludes Safe/Low divisions when avg allocation < 85", () => {
    const resources = [r("D02", "Eng", 70), r("D02", "Eng", 70)];
    const riskByDivision: Record<string, RiskLevel> = { D02: "Safe" };
    const demand = computeRoleDemand(resources, riskByDivision, "2026-04");
    expect(demand.get("Eng")).toBeUndefined();
  });
});

describe("recommendForResource", () => {
  const noDemand = new Map<string, string[]>();
  const demandForEng = new Map<string, string[]>([["Eng", ["D02"]]]);

  it("Optimize when streak >= 3 and division risk is High", () => {
    expect(recommendForResource(3, 0, "High", "Eng", "D01", noDemand)).toBe("Optimize");
  });
  it("Optimize when streak >= 3 and division risk is Extreme", () => {
    expect(recommendForResource(4, 0, "Extreme", "Eng", "D01", noDemand)).toBe("Optimize");
  });
  it("Reallocate when streak >= 1 and another division has demand for the role", () => {
    expect(recommendForResource(1, 50, "Medium", "Eng", "D01", demandForEng)).toBe(
      "Reallocate",
    );
  });
  it("does not Reallocate to the resource's own division", () => {
    const sameDivisionDemand = new Map<string, string[]>([["Eng", ["D01"]]]);
    expect(
      recommendForResource(1, 50, "Medium", "Eng", "D01", sameDivisionDemand),
    ).toBe("Upskill / Reallocate");
  });
  it("Upskill / Reallocate when utilization < 50 and no demand", () => {
    expect(recommendForResource(0, 40, "Medium", "Eng", "D01", noDemand)).toBe(
      "Upskill / Reallocate",
    );
  });
  it("Keep when none of the rules match", () => {
    expect(recommendForResource(0, 90, "Safe", "Eng", "D01", noDemand)).toBe("Keep");
  });
});
```

- [ ] **Step 6.2: Run tests to verify they fail**

Run: `npm test -- tests/recommendations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement `lib/recommendations.ts`**

```ts
// lib/recommendations.ts
import type { Month, Recommendation, ResourceMonth, RiskLevel } from "@/lib/types";

const SATURATION_THRESHOLD = 85;

export function computeRoleDemand(
  allResources: ResourceMonth[],
  riskByDivision: Record<string, RiskLevel>,
  asOf: Month,
): Map<string, string[]> {
  // group by (division, role) at the as-of month, average allocation
  const buckets = new Map<string, { total: number; count: number; division_id: string; role: string }>();
  for (const r of allResources) {
    if (r.month !== asOf) continue;
    const key = `${r.division_id}|${r.role}`;
    const bucket = buckets.get(key) ?? { total: 0, count: 0, division_id: r.division_id, role: r.role };
    bucket.total += r.allocation_percentage;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const demand = new Map<string, string[]>();
  for (const { division_id, role, total, count } of buckets.values()) {
    if (count === 0) continue;
    const risk = riskByDivision[division_id];
    if (risk !== "Safe" && risk !== "Low") continue;
    if (total / count < SATURATION_THRESHOLD) continue;
    const list = demand.get(role) ?? [];
    list.push(division_id);
    demand.set(role, list);
  }
  return demand;
}

export function recommendForResource(
  streak: number,
  utilization: number,
  divisionRisk: RiskLevel,
  role: string,
  ownDivisionId: string,
  roleDemand: Map<string, string[]>,
): Recommendation {
  if (streak >= 3 && (divisionRisk === "High" || divisionRisk === "Extreme")) {
    return "Optimize";
  }
  const demandDivisions = roleDemand.get(role) ?? [];
  const externalDemand = demandDivisions.some((d) => d !== ownDivisionId);
  if (streak >= 1 && externalDemand) return "Reallocate";
  if (utilization < 50) return "Upskill / Reallocate";
  return "Keep";
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

Run: `npm test -- tests/recommendations.test.ts`
Expected: all tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add tests/recommendations.test.ts lib/recommendations.ts
git commit -m "feat(recommendations): add role demand and per-resource action engine"
```

---

## Task 7: Mock data generator

**Files:**
- Create: `scripts/generate-mock.ts`
- Create: `tests/mock-data.test.ts`
- Output: `data/divisions.json`, `data/pnl.json`, `data/resources.json`, `data/headcount.json`

- [ ] **Step 7.1: Implement `scripts/generate-mock.ts`**

```ts
// scripts/generate-mock.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  Month,
  ResourceMonth,
} from "../lib/types";

// Deterministic LCG for reproducibility
let SEED = 42;
function rand(): number {
  SEED = (SEED * 1664525 + 1013904223) % 4294967296;
  return SEED / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const MONTHS: Month[] = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
const ROLES = ["Senior Engineer", "Engineer", "Junior Engineer", "Project Manager", "QA"];

// Each division has a target health profile that drives PnL and bench dynamics.
type Profile = {
  division_id: string;
  name: string;
  target: "Safe" | "Low" | "Medium" | "High" | "Extreme";
  headcount: number;
};

const PROFILES: Profile[] = [
  { division_id: "D01", name: "Cloud Services",     target: "High",    headcount: 42 },
  { division_id: "D02", name: "Data & AI",          target: "Safe",    headcount: 38 },
  { division_id: "D03", name: "Enterprise Apps",    target: "Medium",  headcount: 55 },
  { division_id: "D04", name: "Cybersecurity",      target: "Low",     headcount: 28 },
  { division_id: "D05", name: "Legacy Maintenance", target: "Extreme", headcount: 22 },
];

// GM ranges (actual %, forecast %) per profile that land each in its risk bucket
const GM_RANGES: Record<Profile["target"], { actual: [number, number]; forecast: [number, number] }> = {
  Safe:    { actual: [24, 30], forecast: [26, 32] },
  Low:     { actual: [16, 20], forecast: [14, 18] }, // forecast worsening -> blended in [12,18) trend < 0 -> Medium? Tweak: keep Low cleanly.
  Medium:  { actual: [10, 14], forecast: [9, 12] },
  High:    { actual: [4, 8],   forecast: [3, 7] },
  Extreme: { actual: [-3, 1],  forecast: [-5, 0] },
};

// Bench ratios (what fraction of resources are Non-Allocated)
const BENCH_RATIO: Record<Profile["target"], number> = {
  Safe: 0.05,
  Low: 0.08,
  Medium: 0.12,
  High: 0.20,
  Extreme: 0.30,
};

function genPnL(): DivisionPnL[] {
  const out: DivisionPnL[] = [];
  for (const p of PROFILES) {
    const baseRev = p.headcount * 25000; // ~$25k revenue per head/month
    for (let i = 0; i < MONTHS.length; i++) {
      const month = MONTHS[i];
      const range = GM_RANGES[p.target];
      // Slight downward drift for High/Extreme to give a negative trend
      const drift = p.target === "High" || p.target === "Extreme" ? -0.5 * i : 0;
      const gmActual = range.actual[0] + rand() * (range.actual[1] - range.actual[0]) + drift;
      const gmForecast =
        range.forecast[0] + rand() * (range.forecast[1] - range.forecast[0]) + drift;
      const revenue = baseRev * (0.95 + rand() * 0.1);
      const cost = revenue * (1 - gmActual / 100);
      const revenueF = revenue * (1 + (rand() * 0.06 - 0.03));
      const costF = revenueF * (1 - gmForecast / 100);
      out.push({
        division_id: p.division_id,
        month,
        revenue_actual: Math.round(revenue),
        cost_actual: Math.round(cost),
        gm_actual_pct: Number(gmActual.toFixed(2)),
        revenue_forecast: Math.round(revenueF),
        cost_forecast: Math.round(costF),
        gm_forecast_pct: Number(gmForecast.toFixed(2)),
      });
    }
  }
  return out;
}

function genResourcesAndHeadcount(): {
  resources: ResourceMonth[];
  headcount: HeadcountSnapshot[];
} {
  const resources: ResourceMonth[] = [];
  const headcount: HeadcountSnapshot[] = [];

  let resourceCounter = 1;
  for (const p of PROFILES) {
    // Build the roster for this division
    const roster: { resource_id: string; role: string }[] = [];
    for (let i = 0; i < p.headcount; i++) {
      const role = pick(ROLES);
      roster.push({
        resource_id: `R${String(resourceCounter++).padStart(4, "0")}`,
        role,
      });
    }

    // Pick a "planted idle" set: ceil(2% of HC), guaranteed to be Non-Allocated all 6 months
    const plantedCount = Math.max(2, Math.ceil(p.headcount * 0.02));
    const planted = new Set(roster.slice(0, plantedCount).map((r) => r.resource_id));

    // For each month, decide bench size, growing for Rising bench profiles
    for (let mi = 0; mi < MONTHS.length; mi++) {
      const month = MONTHS[mi];
      let bench = Math.round(p.headcount * BENCH_RATIO[p.target]);
      // For High and Extreme, force monotonically rising bench in last 4 months
      if ((p.target === "High" || p.target === "Extreme") && mi >= MONTHS.length - 4) {
        bench = bench + (mi - (MONTHS.length - 4));
      }
      bench = Math.min(bench, p.headcount);

      // Determine which resources are Non-Allocated this month: planted + random fill
      const nonAlloc = new Set<string>(planted);
      const candidatePool = roster.filter((r) => !planted.has(r.resource_id));
      // Shuffle deterministically
      const shuffled = [...candidatePool].sort(() => rand() - 0.5);
      for (const r of shuffled) {
        if (nonAlloc.size >= bench) break;
        nonAlloc.add(r.resource_id);
      }

      const byRole: Record<string, number> = {};
      for (const member of roster) {
        const isNon = nonAlloc.has(member.resource_id);
        const pct = isNon
          ? 0
          : 60 + Math.floor(rand() * 41); // 60..100
        resources.push({
          resource_id: member.resource_id,
          division_id: p.division_id,
          role: member.role,
          month,
          allocation_status: isNon ? "Non-Allocated" : "Allocated",
          allocation_percentage: pct,
        });
        byRole[member.role] = (byRole[member.role] ?? 0) + 1;
      }
      headcount.push({
        division_id: p.division_id,
        month,
        total_headcount: roster.length,
        by_role: byRole,
      });
    }
  }
  return { resources, headcount };
}

function main() {
  const root = resolve(process.cwd());
  const dataDir = resolve(root, "data");
  mkdirSync(dataDir, { recursive: true });

  const divisions: Division[] = PROFILES.map(({ division_id, name }) => ({ division_id, name }));
  const pnl = genPnL();
  const { resources, headcount } = genResourcesAndHeadcount();

  writeFileSync(resolve(dataDir, "divisions.json"), JSON.stringify(divisions, null, 2));
  writeFileSync(resolve(dataDir, "pnl.json"), JSON.stringify(pnl, null, 2));
  writeFileSync(resolve(dataDir, "resources.json"), JSON.stringify(resources, null, 2));
  writeFileSync(resolve(dataDir, "headcount.json"), JSON.stringify(headcount, null, 2));

  console.log(`Generated:
  divisions: ${divisions.length}
  pnl rows: ${pnl.length}
  resource rows: ${resources.length}
  headcount rows: ${headcount.length}`);
}

main();
```

- [ ] **Step 7.2: Run the generator**

Run: `npm run generate:mock`
Expected: Console output:
```
Generated:
  divisions: 5
  pnl rows: 30
  resource rows: 1110
  headcount rows: 30
```

(Resource rows = sum of headcounts × 6 months = 185 × 6 = 1110.)

- [ ] **Step 7.3: Write tests asserting data shape and that all 5 risk levels are reachable**

```ts
// tests/mock-data.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Division, DivisionPnL, HeadcountSnapshot, ResourceMonth } from "@/lib/types";
import { classifyRisk } from "@/lib/risk";

const root = resolve(__dirname, "..");
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(root, "data", name), "utf-8")) as T;

describe("mock data", () => {
  const divisions = read<Division[]>("divisions.json");
  const pnl = read<DivisionPnL[]>("pnl.json");
  const resources = read<ResourceMonth[]>("resources.json");
  const headcount = read<HeadcountSnapshot[]>("headcount.json");

  it("has 5 divisions", () => {
    expect(divisions).toHaveLength(5);
  });

  it("has 6 months of PnL per division", () => {
    expect(pnl).toHaveLength(30);
  });

  it("has headcount snapshots matching division×month grid", () => {
    expect(headcount).toHaveLength(30);
  });

  it("has resource rows that mention every division", () => {
    const ids = new Set(resources.map((r) => r.division_id));
    expect(ids).toEqual(new Set(divisions.map((d) => d.division_id)));
  });

  it("covers all 5 risk levels at as_of_month=2026-04", () => {
    const asOf = "2026-04";
    const risks = new Set<string>();
    for (const d of divisions) {
      const history = pnl
        .filter((p) => p.division_id === d.division_id)
        .sort((a, b) => a.month.localeCompare(b.month));
      const cur = history.find((h) => h.month === asOf)!;
      const last3Actuals = history.slice(-3).map((h) => h.gm_actual_pct);
      risks.add(classifyRisk(cur.gm_actual_pct, cur.gm_forecast_pct, last3Actuals));
    }
    expect(risks).toEqual(new Set(["Safe", "Low", "Medium", "High", "Extreme"]));
  });
});
```

- [ ] **Step 7.4: Run mock-data tests**

Run: `npm test -- tests/mock-data.test.ts`
Expected: all tests PASS. If "covers all 5 risk levels" fails, the GM ranges in `scripts/generate-mock.ts` need tightening — adjust the matching `GM_RANGES` band by 1–2 percentage points until each profile lands in its target risk bucket, then re-run the generator and re-test.

- [ ] **Step 7.5: Commit**

```bash
git add scripts/generate-mock.ts tests/mock-data.test.ts data/divisions.json data/pnl.json data/resources.json data/headcount.json
git commit -m "feat(mock): add deterministic mock data generator covering all risk levels"
```

---

## Task 8: Data loader and view-model aggregator

**Files:**
- Create: `lib/data.ts`
- Create: `lib/views.ts`

- [ ] **Step 8.1: Create `lib/data.ts`**

```ts
// lib/data.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Division,
  DivisionPnL,
  HeadcountSnapshot,
  ResourceMonth,
} from "@/lib/types";

function read<T>(name: string): T {
  const path = resolve(process.cwd(), "data", name);
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

- [ ] **Step 8.2: Create `lib/views.ts`**

```ts
// lib/views.ts
import type {
  Division,
  DivisionFlag,
  DivisionPnL,
  HeadcountSnapshot,
  Month,
  Recommendation,
  ResourceFlag,
  ResourceMonth,
  RiskLevel,
} from "@/lib/types";
import { classifyRisk, computeBlendedGm, computeTrend } from "@/lib/risk";
import {
  computeNonAllocatedStreak,
  computeTargetCount,
  computeUtilizationScore,
  getOptimizationPct,
  selectCandidates,
} from "@/lib/optimization";
import { getDivisionFlags, getResourceFlags } from "@/lib/flags";
import { computeRoleDemand, recommendForResource } from "@/lib/recommendations";

export type DivisionRiskRow = {
  division_id: string;
  name: string;
  gm_actual_pct: number;
  gm_forecast_pct: number;
  gm_blended: number;
  trend: number;
  risk: RiskLevel;
  opt_pct: number;
  total_headcount: number;
  target_opt_count: number;
  non_allocated_count: number;
  flags: DivisionFlag[];
  gm_actual_history: { month: Month; value: number }[];
};

export type ResourceDetailRow = {
  resource_id: string;
  role: string;
  allocation_history: { month: Month; pct: number; status: ResourceMonth["allocation_status"] }[];
  streak: number;
  utilization: number;
  recommendation: Recommendation;
  flags: ResourceFlag[];
};

export type AlertEntry = {
  division_id: string;
  division_name: string;
  text: string;
  severity: "warning" | "danger";
  resource_ids?: string[];
};

function nonAllocCountByMonth(resources: ResourceMonth[], divisionId: string): number[] {
  const months = Array.from(new Set(resources.map((r) => r.month))).sort();
  return months.map(
    (m) =>
      resources.filter(
        (r) => r.division_id === divisionId && r.month === m && r.allocation_status === "Non-Allocated",
      ).length,
  );
}

export function buildDivisionRiskRows(
  divisions: Division[],
  pnl: DivisionPnL[],
  resources: ResourceMonth[],
  headcount: HeadcountSnapshot[],
  asOf: Month,
): DivisionRiskRow[] {
  return divisions.map((d) => {
    const pnlSorted = pnl
      .filter((p) => p.division_id === d.division_id)
      .sort((a, b) => a.month.localeCompare(b.month));
    const cur = pnlSorted.find((p) => p.month === asOf)!;
    const history = pnlSorted.slice(-3).map((p) => p.gm_actual_pct);
    const trend = computeTrend(history);
    const risk = classifyRisk(cur.gm_actual_pct, cur.gm_forecast_pct, history);
    const blended = computeBlendedGm(cur.gm_actual_pct, cur.gm_forecast_pct);
    const optPct = getOptimizationPct(risk);
    const hc = headcount.find((h) => h.division_id === d.division_id && h.month === asOf)!;
    const target = computeTargetCount(hc.total_headcount, optPct);

    const monthlyNonAlloc = nonAllocCountByMonth(resources, d.division_id);
    const nonAllocCount = resources.filter(
      (r) =>
        r.division_id === d.division_id &&
        r.month === asOf &&
        r.allocation_status === "Non-Allocated",
    ).length;

    return {
      division_id: d.division_id,
      name: d.name,
      gm_actual_pct: cur.gm_actual_pct,
      gm_forecast_pct: cur.gm_forecast_pct,
      gm_blended: Number(blended.toFixed(2)),
      trend: Number(trend.toFixed(2)),
      risk,
      opt_pct: optPct,
      total_headcount: hc.total_headcount,
      target_opt_count: target,
      non_allocated_count: nonAllocCount,
      flags: getDivisionFlags(risk, monthlyNonAlloc),
      gm_actual_history: pnlSorted.map((p) => ({ month: p.month, value: p.gm_actual_pct })),
    };
  });
}

export function buildResourceDetail(
  divisionId: string,
  resources: ResourceMonth[],
  riskByDivision: Record<string, RiskLevel>,
  asOf: Month,
): ResourceDetailRow[] {
  const inDivision = resources.filter((r) => r.division_id === divisionId);
  const window = Array.from(new Set(inDivision.map((r) => r.month))).sort().slice(-3);
  const byResource = new Map<string, ResourceMonth[]>();
  for (const r of inDivision) {
    const list = byResource.get(r.resource_id) ?? [];
    list.push(r);
    byResource.set(r.resource_id, list);
  }
  const roleDemand = computeRoleDemand(resources, riskByDivision, asOf);
  const divisionRisk = riskByDivision[divisionId];

  const rows: ResourceDetailRow[] = [];
  for (const [resource_id, list] of byResource) {
    const sorted = [...list].sort((a, b) => a.month.localeCompare(b.month));
    const role = sorted[sorted.length - 1].role;
    const streak = computeNonAllocatedStreak(sorted, asOf);
    const utilization = computeUtilizationScore(sorted, asOf);
    const allocation_history = window.map((m) => {
      const row = sorted.find((s) => s.month === m);
      return {
        month: m,
        pct: row?.allocation_percentage ?? 0,
        status: row?.allocation_status ?? "Non-Allocated",
      };
    });
    rows.push({
      resource_id,
      role,
      allocation_history,
      streak,
      utilization: Number(utilization.toFixed(1)),
      recommendation: recommendForResource(streak, utilization, divisionRisk, role, divisionId, roleDemand),
      flags: getResourceFlags(streak),
    });
  }

  rows.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.utilization - b.utilization;
  });
  return rows;
}

export function buildOptimizationTable(
  rows: DivisionRiskRow[],
  resources: ResourceMonth[],
  asOf: Month,
): {
  division_id: string;
  name: string;
  total_headcount: number;
  non_allocated_count: number;
  target_opt_count: number;
  top_action: string;
  candidates: { resource_id: string; role: string; streak: number }[];
}[] {
  return rows.map((r) => {
    const inDivision = resources.filter((res) => res.division_id === r.division_id);
    const candidates = selectCandidates(inDivision, r.target_opt_count, asOf);
    const idleCount = candidates.filter((c) => c.streak >= 2).length;
    const otherCount = candidates.length - idleCount;
    const top_action =
      candidates.length === 0
        ? "No optimization required"
        : `Optimize ${idleCount} idle, review ${otherCount} under-utilized`;
    return {
      division_id: r.division_id,
      name: r.name,
      total_headcount: r.total_headcount,
      non_allocated_count: r.non_allocated_count,
      target_opt_count: r.target_opt_count,
      top_action,
      candidates: candidates.map((c) => ({ resource_id: c.resource_id, role: c.role, streak: c.streak })),
    };
  });
}

export function buildAlerts(
  rows: DivisionRiskRow[],
  resources: ResourceMonth[],
  asOf: Month,
): AlertEntry[] {
  const out: AlertEntry[] = [];

  for (const row of rows) {
    for (const f of row.flags) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: f,
        severity: f === "Extreme risk" ? "danger" : "warning",
      });
    }
    // Resource-level idle flags
    const inDivision = resources.filter((r) => r.division_id === row.division_id);
    const byResource = new Map<string, ResourceMonth[]>();
    for (const r of inDivision) {
      const list = byResource.get(r.resource_id) ?? [];
      list.push(r);
      byResource.set(r.resource_id, list);
    }
    const idle3: string[] = [];
    const idle2: string[] = [];
    for (const [resource_id, list] of byResource) {
      const streak = computeNonAllocatedStreak(list, asOf);
      if (streak >= 3) idle3.push(resource_id);
      else if (streak >= 2) idle2.push(resource_id);
    }
    if (idle3.length > 0) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: `Idle 3+ months — high priority (${idle3.length})`,
        severity: "danger",
        resource_ids: idle3,
      });
    }
    if (idle2.length > 0) {
      out.push({
        division_id: row.division_id,
        division_name: row.name,
        text: `Idle 2+ months (${idle2.length})`,
        severity: "warning",
        resource_ids: idle2,
      });
    }
  }
  return out;
}
```

- [ ] **Step 8.3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 8.4: Run all tests to confirm no regressions**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 8.5: Commit**

```bash
git add lib/data.ts lib/views.ts
git commit -m "feat(views): add data loader and per-page view-model builders"
```

---

## Task 9: UI atom — RiskBadge

**Files:**
- Create: `components/RiskBadge.tsx`

- [ ] **Step 9.1: Create `components/RiskBadge.tsx`**

```tsx
// components/RiskBadge.tsx
import type { RiskLevel } from "@/lib/types";

const STYLES: Record<RiskLevel, string> = {
  Safe: "bg-emerald-100 text-emerald-800",
  Low: "bg-lime-100 text-lime-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Extreme: "bg-red-100 text-red-800",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[risk]}`}>
      {risk}
    </span>
  );
}
```

- [ ] **Step 9.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 9.3: Commit**

```bash
git add components/RiskBadge.tsx
git commit -m "feat(ui): add RiskBadge component"
```

---

## Task 10: UI atom — KpiCard

**Files:**
- Create: `components/KpiCard.tsx`

- [ ] **Step 10.1: Create `components/KpiCard.tsx`**

```tsx
// components/KpiCard.tsx
export function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 10.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 10.3: Commit**

```bash
git add components/KpiCard.tsx
git commit -m "feat(ui): add KpiCard component"
```

---

## Task 11: UI atom — GmBarChart

**Files:**
- Create: `components/GmBarChart.tsx`

- [ ] **Step 11.1: Create `components/GmBarChart.tsx`**

```tsx
// components/GmBarChart.tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function GmBarChart({
  data,
}: {
  data: { name: string; actual: number; forecast: number }[];
}) {
  return (
    <div className="h-64 w-full rounded-lg border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip />
          <Legend />
          <Bar dataKey="actual" name="GM Actual %" fill="#0ea5e9" />
          <Bar dataKey="forecast" name="GM Forecast %" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 11.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 11.3: Commit**

```bash
git add components/GmBarChart.tsx
git commit -m "feat(ui): add GmBarChart component"
```

---

## Task 12: UI atom — AllocationSparkline

**Files:**
- Create: `components/AllocationSparkline.tsx`

- [ ] **Step 12.1: Create `components/AllocationSparkline.tsx`**

```tsx
// components/AllocationSparkline.tsx
"use client";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function AllocationSparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={[0, 100]} />
          <Line type="monotone" dataKey="v" stroke="#0ea5e9" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 12.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 12.3: Commit**

```bash
git add components/AllocationSparkline.tsx
git commit -m "feat(ui): add AllocationSparkline component"
```

---

## Task 13: Page 1 — Division Risk Dashboard

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 13.1: Create `app/page.tsx`**

```tsx
// app/page.tsx
import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { KpiCard } from "@/components/KpiCard";
import { GmBarChart } from "@/components/GmBarChart";
import {
  loadDivisions,
  loadHeadcount,
  loadPnL,
  loadResources,
  getAsOfMonth,
} from "@/lib/data";
import { buildDivisionRiskRows } from "@/lib/views";

export default function Page() {
  const divisions = loadDivisions();
  const pnl = loadPnL();
  const resources = loadResources();
  const headcount = loadHeadcount();
  const asOf = getAsOfMonth(pnl);
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
                  <Link href={`/resources/${r.division_id}`} className="text-sky-700 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.gm_actual_pct.toFixed(1)}%</td>
                <td className="px-3 py-2">{r.gm_forecast_pct.toFixed(1)}%</td>
                <td className="px-3 py-2">{r.gm_blended.toFixed(1)}%</td>
                <td className="px-3 py-2">{r.trend > 0 ? "+" : ""}{r.trend.toFixed(2)}%/mo</td>
                <td className="px-3 py-2"><RiskBadge risk={r.risk} /></td>
                <td className="px-3 py-2">{(r.opt_pct * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">{r.target_opt_count} / {r.total_headcount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 13.2: Run dev server and check the page renders**

Run: `npm run dev`
Open: `http://localhost:3000/`
Expected: page shows KPIs, bar chart, and 5-row table with risk badges. All five risk colors visible across the rows. Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 13.3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): add Division Risk Dashboard page"
```

---

## Task 14: Page 2 — Resource Optimization Table

**Files:**
- Create: `app/resources/page.tsx`

- [ ] **Step 14.1: Create `app/resources/page.tsx`**

```tsx
// app/resources/page.tsx
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
                  <Link href={`/resources/${row.division_id}`} className="text-sky-700 hover:underline">
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

- [ ] **Step 14.2: Run dev server and check the page renders**

Run: `npm run dev`
Open: `http://localhost:3000/resources`
Expected: table with one row per division. Stop the dev server.

- [ ] **Step 14.3: Commit**

```bash
git add app/resources/page.tsx
git commit -m "feat(ui): add Resource Optimization Table page"
```

---

## Task 15: Page 3 — Resource Detail (per division)

**Files:**
- Create: `app/resources/[divisionId]/page.tsx`

- [ ] **Step 15.1: Create `app/resources/[divisionId]/page.tsx`**

```tsx
// app/resources/[divisionId]/page.tsx
import { notFound } from "next/navigation";
import { RiskBadge } from "@/components/RiskBadge";
import { AllocationSparkline } from "@/components/AllocationSparkline";
import {
  loadDivisions,
  loadHeadcount,
  loadPnL,
  loadResources,
  getAsOfMonth,
} from "@/lib/data";
import { buildDivisionRiskRows, buildResourceDetail } from "@/lib/views";

export default function ResourceDetail({ params }: { params: { divisionId: string } }) {
  const divisions = loadDivisions();
  const pnl = loadPnL();
  const resources = loadResources();
  const headcount = loadHeadcount();
  const asOf = getAsOfMonth(pnl);
  const rows = buildDivisionRiskRows(divisions, pnl, resources, headcount, asOf);
  const row = rows.find((r) => r.division_id === params.divisionId);
  if (!row) notFound();

  const riskByDivision = Object.fromEntries(rows.map((r) => [r.division_id, r.risk]));
  const detail = buildResourceDetail(params.divisionId, resources, riskByDivision, asOf);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{row.name}</h1>
        <div className="mt-1 flex gap-3 text-sm text-slate-600">
          <RiskBadge risk={row.risk} />
          <span>Opt {(row.opt_pct * 100).toFixed(1)}%</span>
          <span>Target {row.target_opt_count} / {row.total_headcount}</span>
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

- [ ] **Step 15.2: Run dev server and check a division detail page**

Run: `npm run dev`
Open: `http://localhost:3000/resources/D05` (Extreme-risk division)
Expected: header with risk badge, table sorted with longest-streak resources at top, sparklines render. Recommendations include "Optimize" rows. Stop the dev server.

- [ ] **Step 15.3: Commit**

```bash
git add app/resources/[divisionId]/page.tsx
git commit -m "feat(ui): add per-division Resource Detail page"
```

---

## Task 16: Page 4 — Alerts

**Files:**
- Create: `app/alerts/page.tsx`

- [ ] **Step 16.1: Create `app/alerts/page.tsx`**

```tsx
// app/alerts/page.tsx
import {
  loadDivisions,
  loadHeadcount,
  loadPnL,
  loadResources,
  getAsOfMonth,
} from "@/lib/data";
import { buildAlerts, buildDivisionRiskRows } from "@/lib/views";

export default function AlertsPage() {
  const divisions = loadDivisions();
  const pnl = loadPnL();
  const resources = loadResources();
  const headcount = loadHeadcount();
  const asOf = getAsOfMonth(pnl);
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

- [ ] **Step 16.2: Run dev server and check the page**

Run: `npm run dev`
Open: `http://localhost:3000/alerts`
Expected: at minimum one "Extreme risk" alert (D05) and one "Idle 3+ months" alert per High/Extreme division. Stop the dev server.

- [ ] **Step 16.3: Commit**

```bash
git add app/alerts/page.tsx
git commit -m "feat(ui): add Alerts page"
```

---

## Task 17: Acceptance verification

**Files:** none modified — this is an end-to-end smoke check against the spec's acceptance criteria.

- [ ] **Step 17.1: Run the full test suite**

Run: `npm test`
Expected: All suites in `tests/` PASS — 5 files, all green.

- [ ] **Step 17.2: Run a TypeScript build to surface any drift**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; `next build` completes with `Compiled successfully`.

- [ ] **Step 17.3: Walk all 4 pages in the browser**

Run: `npm run dev`
Visit in this order, confirming each criterion:

1. `http://localhost:3000/` → Risk Dashboard renders, all 5 risk badges visible across the 5 rows (covers spec §10 #1 and #2).
2. `http://localhost:3000/resources` → Optimization table shows 5 rows; D05 (Extreme) has the highest target HC.
3. `http://localhost:3000/resources/D05` → Resource detail page; top rows have streak ≥ 3 with "Optimize" recommendation (covers spec §10 #3).
4. `http://localhost:3000/alerts` → Includes "Extreme risk" for D05 and "Idle 3+ months — high priority" entries (covers spec §10 #4).

Stop the dev server.

- [ ] **Step 17.4: Hand-calc spot check**

Pick D01 (High target). Open `data/pnl.json` and find the three most recent rows for D01.

Manually compute:
- `gm_blended = 0.4 * gm_actual_pct(2026-04) + 0.6 * gm_forecast_pct(2026-04)`
- `trend = ` slope of last three `gm_actual_pct` values

Compare those numbers to the values shown in the Risk Dashboard table for D01. They should match to 2 decimal places.

If they match → spec §10 #2 (risk classification matches hand-calc) is satisfied for D01. If a mismatch is found, debug `lib/risk.ts` before continuing.

- [ ] **Step 17.5: Commit acceptance log**

No code changes — this is just a verification gate. If everything above passed, no commit is needed. If you fixed anything in 17.4, that fix is its own commit with a descriptive message.

---

## Self-review (notes for the implementer)

- **Spec coverage:** Tasks 3–7 cover §6 (logic). Task 7 covers §9 (mock data). Tasks 13–16 cover §7 (pages, all four). Task 17 covers §10 (acceptance criteria).
- **TDD discipline:** Tasks 3, 4, 5, 6 follow strict red-green-commit. Task 7 (mock generator) is exercised via post-hoc shape and risk-coverage tests rather than pre-written tests because the generator's output is the input to those tests.
- **Type consistency check passed:** `RiskLevel`, `Recommendation`, `ResourceFlag`, `DivisionFlag`, `Month`, `ResourceMonth`, `Division`, `DivisionPnL`, `HeadcountSnapshot` are defined once in `lib/types.ts` and consumed by name everywhere. No drift.
- **Frequent commits:** Each task ends in a commit; some tasks have intermediate commits where useful.
