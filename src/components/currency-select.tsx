"use client";

import { useState, useRef, useEffect } from "react";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  compact?: boolean; // just show code, no name
}

export function CurrencySelect({ value, onChange, className = "", compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = CURRENCIES.find((c) => c.code === value);

  const filtered = query.trim()
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 30)
    : CURRENCIES.slice(0, 50);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:bg-gray-50 whitespace-nowrap"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium">{selected?.code ?? value}</span>
          {!compact && <span className="text-gray-400 truncate">{selected?.name}</span>}
        </span>
        <span className="text-gray-400 text-xs ml-1 flex-shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search currency..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-emerald-50 ${
                    c.code === value ? "bg-emerald-50 text-emerald-700" : "text-gray-700"
                  }`}
                >
                  <span className="font-medium w-10 flex-shrink-0">{c.code}</span>
                  <span className="text-gray-500 truncate">{c.name}</span>
                  <span className="ml-auto text-gray-400 text-xs">{c.symbol}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
