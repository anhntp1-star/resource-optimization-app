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
