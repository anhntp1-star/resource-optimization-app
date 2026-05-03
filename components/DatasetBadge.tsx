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
