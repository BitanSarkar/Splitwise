"use client";

import { useMemo, useState } from "react";
import { formatCurrency, type RawBalance } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

// A member — we just need the bits to render a row label/avatar.
interface DetailedMember {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  isGuest?: boolean;
  avatarEmoji?: string | null;
}

interface Props {
  rawBalances: RawBalance[];
  members: DetailedMember[];
  currentUserId: string;
}

// Per (from → to, currency) aggregated edge.
interface PairEdge {
  from: string;
  to: string;
  currency: string;
  amount: number;
}

// Groups pair edges so forward and reverse flows for the same two people
// show up next to each other and can be netted visually.
interface PairGroup {
  a: string; // lexicographically smaller id — just a stable ordering key
  b: string;
  // For each currency seen in this pair, the raw forward (a→b) and reverse
  // (b→a) totals + the net (positive = a owes b, negative = b owes a).
  byCurrency: {
    currency: string;
    aToB: number;
    bToA: number;
    net: number; // > 0 means a→b, < 0 means b→a
  }[];
}

// Un-simplified pairwise view. Aggregates raw per-split balances by the
// (from, to, currency) triple so a pair that has 10 unpaid splits shows up
// as one row (per currency), not 10. This is the "who actually owes whom"
// view before the net-balance simplifier redistributes flows to minimize
// payments. Includes guests — they're modeled as regular members.
export function DetailedBalances({ rawBalances, members, currentUserId }: Props) {
  const [showNetOnly, setShowNetOnly] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  // Collapse raw entries (which have one row per unpaid split) into one row
  // per (from, to, currency).
  const edges: PairEdge[] = useMemo(() => {
    const map = new Map<string, PairEdge>();
    for (const b of rawBalances) {
      if (!b.amount || b.amount < 0.01) continue;
      const key = `${b.from}|${b.to}|${b.currency}`;
      const existing = map.get(key);
      if (existing) {
        existing.amount += b.amount;
      } else {
        map.set(key, { from: b.from, to: b.to, currency: b.currency, amount: b.amount });
      }
    }
    return Array.from(map.values());
  }, [rawBalances]);

  // Group forward+reverse edges for the same two people. `a` is always the
  // lexicographically smaller id so each pair has one stable group key.
  const pairGroups: PairGroup[] = useMemo(() => {
    const groups = new Map<string, PairGroup>();
    for (const e of edges) {
      const [a, b] = e.from < e.to ? [e.from, e.to] : [e.to, e.from];
      const key = `${a}|${b}`;
      let g = groups.get(key);
      if (!g) {
        g = { a, b, byCurrency: [] };
        groups.set(key, g);
      }
      let row = g.byCurrency.find((r) => r.currency === e.currency);
      if (!row) {
        row = { currency: e.currency, aToB: 0, bToA: 0, net: 0 };
        g.byCurrency.push(row);
      }
      if (e.from === a) {
        row.aToB += e.amount;
      } else {
        row.bToA += e.amount;
      }
      row.net = row.aToB - row.bToA;
    }
    // Stable sort: pairs involving the current user first.
    return Array.from(groups.values()).sort((x, y) => {
      const xMe = x.a === currentUserId || x.b === currentUserId ? 0 : 1;
      const yMe = y.a === currentUserId || y.b === currentUserId ? 0 : 1;
      if (xMe !== yMe) return xMe - yMe;
      return 0;
    });
  }, [edges, currentUserId]);

  function labelFor(id: string) {
    const m = memberMap.get(id);
    if (!m) return "Unknown";
    if (id === currentUserId) return "You";
    return m.name ?? m.email ?? "Unknown";
  }

  function renderAvatar(id: string) {
    const m = memberMap.get(id);
    if (!m) {
      return (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
          ?
        </div>
      );
    }
    if (m.isGuest) {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-sm leading-none">
          {m.avatarEmoji ?? "👤"}
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-medium text-emerald-700">
        {(m.name ?? m.email ?? "?")[0]?.toUpperCase()}
      </div>
    );
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (pairGroups.length === 0) {
    return null;
  }

  // Count how many pairs have bidirectional flow (useful as a hint for the
  // "show raw" toggle).
  const hasBidirectional = pairGroups.some((g) =>
    g.byCurrency.some((c) => c.aToB > 0 && c.bToA > 0)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-1">
          All balances
        </p>
        {hasBidirectional && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNetOnly}
              onChange={(e) => setShowNetOnly(e.target.checked)}
              className="accent-emerald-600"
            />
            Net per pair
          </label>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {pairGroups.map((g) => {
          const key = `${g.a}|${g.b}`;
          const isOpen = expanded.has(key);
          const hasRaw = g.byCurrency.some((c) => c.aToB > 0 && c.bToA > 0);

          return (
            <div key={key}>
              {/* Summary row(s): one per currency, showing net or both sides */}
              <div className="px-4 py-2 space-y-1.5">
                {g.byCurrency.map((c) => {
                  if (showNetOnly) {
                    if (Math.abs(c.net) < 0.01) {
                      return (
                        <div
                          key={c.currency}
                          className="flex items-center text-sm text-gray-400"
                        >
                          <div className="flex items-center gap-1.5">
                            {renderAvatar(g.a)}
                            <span>{labelFor(g.a)}</span>
                            <span className="mx-1 text-gray-300">⇄</span>
                            {renderAvatar(g.b)}
                            <span>{labelFor(g.b)}</span>
                          </div>
                          <span className="ml-auto text-xs">
                            settled ({c.currency})
                          </span>
                        </div>
                      );
                    }
                    const fromId = c.net > 0 ? g.a : g.b;
                    const toId = c.net > 0 ? g.b : g.a;
                    const amt = Math.abs(c.net);
                    const involvesMe = fromId === currentUserId || toId === currentUserId;
                    const iOwe = fromId === currentUserId;
                    return (
                      <div
                        key={c.currency}
                        className={`flex items-center text-sm rounded px-1.5 py-0.5 ${
                          involvesMe
                            ? iOwe
                              ? "bg-red-50"
                              : "bg-emerald-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {renderAvatar(fromId)}
                          <span
                            className={`truncate ${
                              iOwe ? "font-medium text-red-700" : "text-gray-700"
                            }`}
                          >
                            {labelFor(fromId)}
                          </span>
                          <span className="mx-1 text-gray-400 flex-shrink-0">→</span>
                          {renderAvatar(toId)}
                          <span
                            className={`truncate ${
                              !iOwe && involvesMe
                                ? "font-medium text-emerald-700"
                                : "text-gray-700"
                            }`}
                          >
                            {labelFor(toId)}
                          </span>
                        </div>
                        <span className="ml-auto font-medium text-gray-900 flex-shrink-0">
                          {formatCurrency(amt, c.currency)}
                        </span>
                      </div>
                    );
                  }
                  // Not net-only: show both directions if present.
                  return (
                    <div key={c.currency} className="space-y-1">
                      {c.aToB > 0 && (
                        <div className="flex items-center text-sm">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {renderAvatar(g.a)}
                            <span className="truncate text-gray-700">
                              {labelFor(g.a)}
                            </span>
                            <span className="mx-1 text-gray-400 flex-shrink-0">→</span>
                            {renderAvatar(g.b)}
                            <span className="truncate text-gray-700">
                              {labelFor(g.b)}
                            </span>
                          </div>
                          <span className="ml-auto font-medium text-gray-900 flex-shrink-0">
                            {formatCurrency(c.aToB, c.currency)}
                          </span>
                        </div>
                      )}
                      {c.bToA > 0 && (
                        <div className="flex items-center text-sm">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {renderAvatar(g.b)}
                            <span className="truncate text-gray-700">
                              {labelFor(g.b)}
                            </span>
                            <span className="mx-1 text-gray-400 flex-shrink-0">→</span>
                            {renderAvatar(g.a)}
                            <span className="truncate text-gray-700">
                              {labelFor(g.a)}
                            </span>
                          </div>
                          <span className="ml-auto font-medium text-gray-900 flex-shrink-0">
                            {formatCurrency(c.bToA, c.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* In net-only mode, if the pair has bidirectional flow we let
                  the user drill down to see the gross amounts. */}
              {showNetOnly && hasRaw && (
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full text-left px-4 pb-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>
                    {isOpen ? "Hide" : "Show"} gross flow
                  </span>
                </button>
              )}

              {showNetOnly && isOpen && (
                <div className="px-4 pb-2 space-y-1 bg-gray-50/50">
                  {g.byCurrency.map((c) => (
                    <div key={c.currency} className="space-y-0.5">
                      {c.aToB > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="truncate">
                            {labelFor(g.a)} → {labelFor(g.b)}
                          </span>
                          <span className="ml-auto">
                            {formatCurrency(c.aToB, c.currency)}
                          </span>
                        </div>
                      )}
                      {c.bToA > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="truncate">
                            {labelFor(g.b)} → {labelFor(g.a)}
                          </span>
                          <span className="ml-auto">
                            {formatCurrency(c.bToA, c.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          Pairwise balances before simplification — includes guests.
        </span>
      </div>
    </div>
  );
}
