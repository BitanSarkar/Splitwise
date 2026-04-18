"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  createdAt: Date | null;
}
interface Split { expenseId: string; userId: string; amount: number }
interface Settlement {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  createdAt: Date | null;
}
interface Group { id: string; name: string; emoji: string | null }

interface Props {
  expenses: Expense[];
  splits: Split[];
  settlements: Settlement[];
  groups: Group[];
  currentUserId: string;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function DashboardCharts({ expenses, splits, settlements, groups, currentUserId }: Props) {
  const groupMap = useMemo(
    () => new Map(groups.map((g) => [g.id, `${g.emoji ?? "👥"} ${g.name}`])),
    [groups]
  );

  const currencies = useMemo(() => {
    const s = new Set(expenses.map((e) => e.currency));
    settlements.forEach((x) => s.add(x.currency));
    return Array.from(s).sort();
  }, [expenses, settlements]);

  const [currency, setCurrency] = useState(currencies[0] ?? "USD");

  const expensesIn = useMemo(
    () => expenses.filter((e) => e.currency === currency),
    [expenses, currency]
  );
  const expenseIdsIn = useMemo(() => new Set(expensesIn.map((e) => e.id)), [expensesIn]);
  const splitsIn = useMemo(
    () => splits.filter((s) => expenseIdsIn.has(s.expenseId)),
    [splits, expenseIdsIn]
  );

  // 1. Spend per group (all currencies combined label, but filter by currency)
  const spendPerGroup = useMemo(() => {
    const tot = new Map<string, number>();
    for (const e of expensesIn) {
      tot.set(e.groupId, (tot.get(e.groupId) ?? 0) + e.amount);
    }
    return Array.from(tot.entries()).map(([gid, v]) => {
      const raw = groupMap.get(gid) ?? gid;
      return {
        name: raw.length > 14 ? raw.slice(0, 14) + "…" : raw,
        fullName: raw,
        value: Math.round(v * 100) / 100,
      };
    });
  }, [expensesIn, groupMap]);

  // 2. Monthly spending timeseries
  const monthly = useMemo(() => {
    const byMonth = new Map<string, { total: number; yours: number }>();
    const mySplitByExpense = new Map<string, number>();
    for (const s of splitsIn) {
      if (s.userId === currentUserId) {
        mySplitByExpense.set(s.expenseId, (mySplitByExpense.get(s.expenseId) ?? 0) + s.amount);
      }
    }
    for (const e of expensesIn) {
      if (!e.createdAt) continue;
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? { total: 0, yours: 0 };
      cur.total += e.amount;
      cur.yours += mySplitByExpense.get(e.id) ?? 0;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
          month: "short", year: "2-digit",
        });
        return {
          month: label,
          Total: Math.round(v.total * 100) / 100,
          Yours: Math.round(v.yours * 100) / 100,
        };
      });
  }, [expensesIn, splitsIn, currentUserId]);

  // 3. You paid vs you consumed (overall)
  const youPaidVsConsumed = useMemo(() => {
    let paid = 0;
    let consumed = 0;
    for (const e of expensesIn) {
      if (e.paidBy === currentUserId) paid += e.amount;
    }
    for (const s of splitsIn) {
      if (s.userId === currentUserId) consumed += s.amount;
    }
    return [
      { name: "You paid", value: Math.round(paid * 100) / 100 },
      { name: "You consumed", value: Math.round(consumed * 100) / 100 },
    ];
  }, [expensesIn, splitsIn, currentUserId]);

  // 4. Expense count per group
  const countPerGroup = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of expenses) {
      c.set(e.groupId, (c.get(e.groupId) ?? 0) + 1);
    }
    return Array.from(c.entries())
      .map(([gid, v]) => ({ name: groupMap.get(gid) ?? gid, count: v }))
      .sort((a, b) => b.count - a.count);
  }, [expenses, groupMap]);

  // 5. Currency mix across all groups
  const currencyMix = useMemo(() => {
    const tot = new Map<string, number>();
    for (const e of expenses) {
      tot.set(e.currency, (tot.get(e.currency) ?? 0) + e.amount);
    }
    return Array.from(tot.entries()).map(([c, v]) => ({
      name: c,
      value: Math.round(v * 100) / 100,
    }));
  }, [expenses]);

  if (expenses.length === 0) {
    return null;
  }

  const fmt = (v: unknown) => formatCurrency(Number(v) || 0, currency);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Insights</p>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Spend per group" subtitle={`In ${currency}`}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={spendPerGroup} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} isAnimationActive={false}>
                {spendPerGroup.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmt} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly spending" subtitle={`In ${currency}`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="totGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="yoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={fmt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Total" stroke="#3b82f6" fill="url(#totGrad)" strokeWidth={2} isAnimationActive={false} dot={{ r: 3 }} />
              <Area type="monotone" dataKey="Yours" stroke="#10b981" fill="url(#yoursGrad)" strokeWidth={2} isAnimationActive={false} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="You paid vs. you consumed" subtitle={`In ${currency}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={youPaidVsConsumed} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={fmt} />
              <Bar dataKey="value" isAnimationActive={false}>
                {youPaidVsConsumed.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#10b981" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expense count per group" subtitle="All currencies">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={countPerGroup} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {currencies.length > 1 && (
          <ChartCard title="Currency mix" subtitle="Raw totals (no conversion)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={currencyMix} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} isAnimationActive={false}>
                  {currencyMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
