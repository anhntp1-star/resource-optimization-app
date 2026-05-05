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
