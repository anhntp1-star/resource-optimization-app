"use client";
import { useRef, useState } from "react";

export function CsvDropzone({
  label,
  onFile,
}: {
  label: string;
  onFile: (text: string, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function handle(file: File) {
    const text = await file.text();
    onFile(text, file.name);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await handle(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm transition-colors ${
        over ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-white"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-1 text-xs text-slate-500">Drop a CSV file or click to choose</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handle(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
