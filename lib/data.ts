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
