import { auth } from "@/auth";
import { getDashboardData, getDashboardChartData } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard-charts";
import Link from "next/link";

function CurrencyAmounts({
  map,
  colorClass,
  emptyText,
  signed = false,
}: {
  map: Record<string, number>;
  colorClass: (amount: number) => string;
  emptyText: string;
  signed?: boolean;
}) {
  const entries = Object.entries(map)
    .filter(([, v]) => Math.abs(v) >= 0.01)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return <p className="text-base font-semibold text-gray-400">{emptyText}</p>;
  }

  return (
    <div className="space-y-0.5 mt-1">
      {entries.map(([currency, amount]) => (
        <p key={currency} className={`text-base sm:text-lg font-semibold leading-tight ${colorClass(amount)}`}>
          {signed && amount > 0 ? "+" : ""}
          {amount < 0 ? "-" : ""}
          {formatCurrency(Math.abs(amount), currency)}
        </p>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const { owedByCurrency, oweByCurrency, groups } = await getDashboardData();
  const chartData = await getDashboardChartData();

  // Compute net per currency
  const allCurrencies = new Set([...Object.keys(owedByCurrency), ...Object.keys(oweByCurrency)]);
  const netByCurrency: Record<string, number> = {};
  for (const currency of allCurrencies) {
    const net = ((owedByCurrency[currency] ?? 0) - (oweByCurrency[currency] ?? 0));
    if (Math.abs(net) >= 0.01) {
      netByCurrency[currency] = Math.round(net * 100) / 100;
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
          Hi, {session?.user?.name?.split(" ")[0]}
        </h1>
        <Link
          href="/groups/new"
          className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
        >
          + New Group
        </Link>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">Owed to you</p>
          <CurrencyAmounts
            map={owedByCurrency}
            colorClass={() => "text-emerald-600"}
            emptyText="—"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">You owe</p>
          <CurrencyAmounts
            map={oweByCurrency}
            colorClass={() => "text-red-500"}
            emptyText="—"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">Net</p>
          {Object.keys(netByCurrency).length === 0 ? (
            <p className="text-base font-semibold text-gray-400 mt-1">All clear</p>
          ) : (
            <CurrencyAmounts
              map={netByCurrency}
              colorClass={(v) => (v >= 0 ? "text-emerald-600" : "text-red-500")}
              emptyText="All clear"
              signed
            />
          )}
        </div>
      </div>

      {/* Insights */}
      {chartData.expenses.length > 0 && (
        <DashboardCharts
          expenses={chartData.expenses}
          splits={chartData.splits}
          settlements={chartData.settlements}
          groups={chartData.groups}
          currentUserId={chartData.currentUserId ?? session!.user!.id!}
        />
      )}

      {/* Groups */}
      <div>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Your Groups</h2>

        {groups.length === 0 ? (
          <div className="space-y-3">
            {/* Onboarding card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-base font-semibold text-emerald-900">👋 Welcome to Splitwise!</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Split expenses fairly with friends, family, or teammates — with or without them having an account.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white border border-emerald-100 rounded-md px-3 py-2.5 space-y-1">
                  <p className="font-medium text-gray-800">1. Create a group</p>
                  <p className="text-xs text-gray-500">Trip, household, dinner — any shared spending occasion.</p>
                </div>
                <div className="bg-white border border-emerald-100 rounded-md px-3 py-2.5 space-y-1">
                  <p className="font-medium text-gray-800">2. Log expenses</p>
                  <p className="text-xs text-gray-500">Add what was spent, who paid, and how to split it — 4 split modes.</p>
                </div>
                <div className="bg-white border border-emerald-100 rounded-md px-3 py-2.5 space-y-1">
                  <p className="font-medium text-gray-800">3. Settle up</p>
                  <p className="text-xs text-gray-500">See who owes whom, record payments, done. Guests welcome too.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href="/groups/new"
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
                >
                  Create your first group →
                </Link>
                <Link
                  href="/help"
                  className="text-sm text-emerald-700 hover:underline"
                >
                  Read the full guide
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
              >
                <span className="text-xl flex-shrink-0">{group.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-gray-500 truncate">{group.description}</p>
                  )}
                </div>
                <span className="ml-auto text-gray-400 text-xs flex-shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
