export type Month = string; // "YYYY-MM"

export type Division = {
  division_id: string;
  name: string;
};

export type DivisionPnL = {
  division_id: string;
  division_name?: string;
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
