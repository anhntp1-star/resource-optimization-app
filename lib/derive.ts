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
