"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type Member = { id: string; name: string | null; email: string | null };
type Split = { userId: string; amount: number };
type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitType: string;
  createdAt: Date | null;
  splits: Split[];
};
type Settlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  createdAt: Date | null;
};

interface Props {
  expenses: Expense[];
  members: Member[];
  settlements: Settlement[];
  currentUserId: string;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const SPLIT_LABELS: Record<string, string> = {
  equal: "Equal",
  percentage: "Percentage",
  exact: "Exact",
  shares: "Shares",
};

export function GroupCharts({ expenses, members, settlements, currentUserId }: Props) {
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m.name ?? m.email])),
    [members]
  );

  // Group expenses by currency
  const currencies = useMemo(() => {
    const set = new Set(expenses.map((e) => e.currency));
    settlements.forEach((s) => set.add(s.currency));
    return Array.from(set).sort();
  }, [expenses, settlements]);

  const [currency, setCurrency] = useState(currencies[0] ?? "USD");

  const expensesInCurrency = useMemo(
    () => expenses.filter((e) => e.currency === currency),
    [expenses, currency]
  );
  const settlementsInCurrency = useMemo(
    () => settlements.filter((s) => s.currency === currency),
    [settlements, currency]
  );

  // 1. Spending over time (daily)
  const timeseries = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const e of expensesInCurrency) {
      if (!e.createdAt) continue;
      const d = new Date(e.createdAt);
      const key = d.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + e.amount);
    }
    const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
    const cumulative = sorted.reduce<number[]>((acc, [, amt]) => {
      acc.push((acc[acc.length - 1] ?? 0) + amt);
      return acc;
    }, []);
    return sorted.map(([date, amount], i) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daily: Math.round(amount * 100) / 100,
      cumulative: Math.round(cumulative[i] * 100) / 100,
    }));
  }, [expensesInCurrency]);

  // 2. Who paid vs. who consumed
  const paidVsConsumed = useMemo(() => {
    const paid = new Map<string, number>();
    const consumed = new Map<string, number>();
    for (const e of expensesInCurrency) {
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount);
      for (const s of e.splits) {
        consumed.set(s.userId, (consumed.get(s.userId) ?? 0) + s.amount);
      }
    }
    return members.map((m) => ({
      name: (m.name ?? m.email ?? "Unknown").split(" ")[0],
      Paid: Math.round((paid.get(m.id) ?? 0) * 100) / 100,
      Consumed: Math.round((consumed.get(m.id) ?? 0) * 100) / 100,
    }));
  }, [expensesInCurrency, members]);

  // 3. Net balance per member (>0 is owed to them, <0 means they owe)
  const netBalances = useMemo(() => {
    const net = new Map<string, number>();
    for (const e of expensesInCurrency) {
      net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amount);
      for (const s of e.splits) {
        net.set(s.userId, (net.get(s.userId) ?? 0) - s.amount);
      }
    }
    for (const s of settlementsInCurrency) {
      net.set(s.fromUserId, (net.get(s.fromUserId) ?? 0) + s.amount);
      net.set(s.toUserId, (net.get(s.toUserId) ?? 0) - s.amount);
    }
    return members
      .map((m) => ({
        name: (m.name ?? m.email ?? "Unknown").split(" ")[0],
        balance: Math.round((net.get(m.id) ?? 0) * 100) / 100,
        isMe: m.id === currentUserId,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [expensesInCurrency, settlementsInCurrency, members, currentUserId]);

  // 4. Split-type distribution
  const splitTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expensesInCurrency) {
      counts.set(e.splitType, (counts.get(e.splitType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({
      name: SPLIT_LABELS[type] ?? type,
      value: count,
    }));
  }, [expensesInCurrency]);

  // 5. Top expenses (by amount)
  const topExpenses = useMemo(() => {
    return [...expensesInCurrency]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((e) => ({
        name: e.description.length > 20 ? e.description.slice(0, 20) + "…" : e.description,
        amount: e.amount,
      }));
  }, [expensesInCurrency]);

  // 6. Paid-by distribution (pie)
  const paidByPie = useMemo(() => {
    const paid = new Map<string, number>();
    for (const e of expensesInCurrency) {
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount);
    }
    return Array.from(paid.entries())
      .filter(([, v]) => v > 0)
      .map(([uid, v]) => ({
        name: (memberMap.get(uid) ?? "?").split(" ")[0],
        value: Math.round(v * 100) / 100,
      }));
  }, [expensesInCurrency, memberMap]);

  // 7. Day-of-week pattern
  const byDayOfWeek = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const tot = [0, 0, 0, 0, 0, 0, 0];
    for (const e of expensesInCurrency) {
      if (!e.createdAt) continue;
      const d = new Date(e.createdAt).getDay();
      tot[d] += e.amount;
    }
    return days.map((name, i) => ({ name, amount: Math.round(tot[i] * 100) / 100 }));
  }, [expensesInCurrency]);

  // 8. Currency mix (only shown when multiple currencies)
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
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">Add some expenses to see charts.</p>
      </div>
    );
  }

  const fmt = (v: unknown) => formatCurrency(Number(v) || 0, currency);

  return (
    <div className="space-y-4">
      {/* Currency selector */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Charts</p>
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
        {/* Cumulative spending */}
        <ChartCard title="Cumulative spending" subtitle={`In ${currency}`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeseries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={fmt} />
              <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2} isAnimationActive={false} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily spending */}
        <ChartCard title="Daily spending" subtitle={`In ${currency}`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeseries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={fmt} />
              <Line type="monotone" dataKey="daily" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Paid vs Consumed */}
        <ChartCard title="Paid vs. consumed" subtitle="Per member">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={paidVsConsumed} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={fmt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" fill="#10b981" isAnimationActive={false} />
              <Bar dataKey="Consumed" fill="#f59e0b" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Net balance */}
        <ChartCard title="Net balance" subtitle="Positive = owed; negative = owes">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={netBalances} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} width={60} />
              <Tooltip formatter={fmt} />
              <Bar dataKey="balance" isAnimationActive={false}>
                {netBalances.map((d, i) => (
                  <Cell key={i} fill={d.balance >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Who paid - pie */}
        <ChartCard title="Who paid" subtitle="Share of total payments">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={paidByPie} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} isAnimationActive={false}>
                {paidByPie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmt} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Split-type breakdown */}
        <ChartCard title="Split-type breakdown" subtitle="Expense count">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={splitTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} isAnimationActive={false}>
                {splitTypeBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top expenses */}
        <ChartCard title="Top expenses" subtitle={`Largest in ${currency}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topExpenses} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={90} />
              <Tooltip formatter={fmt} />
              <Bar dataKey="amount" fill="#8b5cf6" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Day-of-week pattern */}
        <ChartCard title="By day of week" subtitle="Spending rhythm">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDayOfWeek} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={fmt} />
              <Bar dataKey="amount" fill="#06b6d4" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Currency mix — only when multiple currencies */}
        {currencies.length > 1 && (
          <ChartCard title="Currency mix" subtitle="Total spend by currency (raw, no conversion)">
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
