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

  const recompute = useCallback((s: Omit<Dataset, "isCustom"> | null) => {
    if (!s) return;
    setDataset(buildCustomDataset(getPnL(), getResources(), s));
  }, []);

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
