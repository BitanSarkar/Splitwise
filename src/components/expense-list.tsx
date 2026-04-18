"use client";

import { useState, useTransition } from "react";
import { getExchangeRates } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencySelect } from "@/components/currency-select";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { EditExpenseDialog } from "@/components/edit-expense-dialog";
import Image from "next/image";

type Member = { id: string; name: string | null; email: string; image?: string | null; role?: string };
type Split = {
  expenseId: string;
  userId: string;
  amount: number;
  percentage?: number | null;
  shares?: number | null;
  isPaid: boolean;
  userName: string | null;
};
type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName: string | null;
  paidByImage: string | null;
  splitType: string;
  createdBy: string;
  createdAt: Date | null;
  splits: Split[];
};

interface Props {
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
}

export function ExpenseList({ expenses, members, currentUserId }: Props) {
  const [displayCurrency, setDisplayCurrency] = useState("");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateError, setRateError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCurrencyChange(currency: string) {
    setDisplayCurrency(currency);
    setRates(null);
    setRateError("");
    if (!currency) return;
    startTransition(async () => {
      try {
        const r = await getExchangeRates(currency);
        setRates(r);
      } catch {
        setRateError("Could not fetch rates");
      }
    });
  }

  function convert(amount: number, fromCurrency: string): number | null {
    if (!rates || !displayCurrency || fromCurrency === displayCurrency) return null;
    const rate = rates[fromCurrency];
    return rate ? amount / rate : null;
  }

  const simplifiedMembers = members.map((m) => ({ id: m.id, name: m.name, email: m.email }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
          Expenses ({expenses.length})
        </p>
        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
          {isPending && <span className="text-xs text-gray-400">Fetching rates…</span>}
          {rateError && <span className="text-xs text-red-400">{rateError}</span>}
          <span className="text-xs text-gray-400 whitespace-nowrap">Display in</span>
          <div className="w-36 sm:w-40">
            <CurrencySelect value={displayCurrency} onChange={handleCurrencyChange} />
          </div>
          {displayCurrency && (
            <button
              type="button"
              onClick={() => { setDisplayCurrency(""); setRates(null); setRateError(""); }}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No expenses yet</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {expenses.map((expense) => {
            const myShare = expense.splits.find((s) => s.userId === currentUserId);
            const iPaid = expense.paidBy === currentUserId;
            const myNet = iPaid
              ? expense.amount - (myShare?.amount ?? 0)
              : -(myShare?.amount ?? 0);

            const convertedTotal = convert(expense.amount, expense.currency);
            const convertedNet = myNet !== 0 ? convert(Math.abs(myNet), expense.currency) : null;

            return (
              <div key={expense.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {expense.paidByImage ? (
                    <Image src={expense.paidByImage} alt="" width={32} height={32} className="rounded-full" />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {expense.paidByName?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                  <p className="text-xs text-gray-400">
                    {iPaid ? "You" : expense.paidByName} paid {formatCurrency(expense.amount, expense.currency)}
                    {convertedTotal !== null && (
                      <span className="text-gray-300"> ≈ {formatCurrency(convertedTotal, displayCurrency)}</span>
                    )}
                    {expense.createdAt && <span> · {formatDate(expense.createdAt)}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    {myNet > 0 ? (
                      <>
                        <p className="text-sm font-medium text-emerald-600">+{formatCurrency(myNet, expense.currency)}</p>
                        {convertedNet !== null && (
                          <p className="text-xs text-emerald-400">+{formatCurrency(convertedNet, displayCurrency)}</p>
                        )}
                      </>
                    ) : myNet < 0 ? (
                      <>
                        <p className="text-sm font-medium text-red-500">{formatCurrency(myNet, expense.currency)}</p>
                        {convertedNet !== null && (
                          <p className="text-xs text-red-300">-{formatCurrency(convertedNet, displayCurrency)}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">not involved</p>
                    )}
                  </div>
                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <EditExpenseDialog expense={expense} members={simplifiedMembers} currentUserId={currentUserId} />
                    <DeleteExpenseButton expenseId={expense.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
