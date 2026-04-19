"use client";

import { useState, useTransition, useEffect } from "react";
import { getExchangeRates } from "@/lib/actions";
import { simplifyDebts, simplifyDebtsConverted, type RawBalance, type SimplifiedDebt } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { FRANKFURTER_CURRENCIES } from "@/lib/currencies";
import { CurrencySelect } from "@/components/currency-select";
import { Hint } from "@/components/hint";

interface MemberInfo {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  rawBalances: RawBalance[];
  members: MemberInfo[];
  currentUserId: string;
  defaultCurrency?: string;
}

export function BalanceDisplay({ rawBalances, members, currentUserId, defaultCurrency = "USD" }: Props) {
  const [convertTo, setConvertTo] = useState(defaultCurrency);
  const [converted, setConverted] = useState<SimplifiedDebt[] | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const simplified = simplifyDebts(rawBalances);

  useEffect(() => {
    if (defaultCurrency) handleConvert(defaultCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConvert(currency: string) {
    setConvertTo(currency);
    setConverted(null);
    setError("");
    if (!currency) return;

    if (!FRANKFURTER_CURRENCIES.has(currency)) {
      setError(`Live rates not available for ${currency}. Supported: USD, EUR, GBP, INR, JPY and other major currencies.`);
      return;
    }

    startTransition(async () => {
      try {
        const rates = await getExchangeRates(currency);
        setConverted(simplifyDebtsConverted(rawBalances, rates, currency));
      } catch {
        setError("Failed to fetch exchange rates. Try again.");
      }
    });
  }

  const display: SimplifiedDebt[] = converted ?? simplified;

  const myBalance = display.reduce((sum, s) => {
    if (s.to === currentUserId) return sum + s.amount;
    if (s.from === currentUserId) return sum - s.amount;
    return sum;
  }, 0);

  const displayCurrency = converted ? convertTo : null;

  // How much debt was reduced
  const rawCount = rawBalances.length;
  const simplifiedCount = display.length;
  const reducedCount = rawCount - simplifiedCount;
  const allCancelledOut = rawCount > 0 && simplifiedCount === 0;

  return (
    <div className="space-y-3">
      {/* Your balance strip */}
      <div className={`rounded-lg px-4 py-3 text-sm font-medium leading-snug ${
        myBalance === 0
          ? "bg-gray-100 text-gray-600"
          : myBalance > 0
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-red-50 text-red-700 border border-red-100"
      }`}>
        {myBalance === 0
          ? "✓ You're all settled up"
          : myBalance > 0
          ? `You are owed ${formatCurrency(myBalance, displayCurrency ?? "USD")} in total${displayCurrency ? ` (${displayCurrency})` : ""}`
          : `You owe ${formatCurrency(Math.abs(myBalance), displayCurrency ?? "USD")} in total${displayCurrency ? ` (${displayCurrency})` : ""}`}
      </div>

      {/* All circular debts cancelled */}
      {allCancelledOut && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-500">⇄</span>
          <p className="text-sm text-gray-700">
            All debts cancel out — circular payments detected, no one owes anyone anything.
          </p>
        </div>
      )}

      {/* Who owes whom */}
      {display.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
                Who owes whom
              </p>
              {reducedCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">
                    {rawCount}→{simplifiedCount} simplified
                  </span>
                  <Hint
                    position="right"
                    width="max-w-xs"
                    text={`Net balance simplification reduced ${rawCount} individual debt edges to just ${simplifiedCount} payment(s). The same money moves, but with fewer transactions. View the full breakdown in "All balances".`}
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap">Convert to</span>
              <div className="w-36 sm:w-40">
                <CurrencySelect value={convertTo || ""} onChange={handleConvert} />
              </div>
              {convertTo !== defaultCurrency && (
                <button
                  type="button"
                  onClick={() => handleConvert(defaultCurrency)}
                  className="text-xs text-gray-400 hover:text-gray-700 whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {isPending ? (
            <div className="px-4 py-3 text-sm text-gray-400">Fetching live rates…</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {display.map((s, i) => {
                const fromName = memberMap.get(s.from)?.name ?? "Unknown";
                const toName = memberMap.get(s.to)?.name ?? "Unknown";
                const isMe = s.from === currentUserId;
                const owesMe = s.to === currentUserId;
                return (
                  <div
                    key={i}
                    className={`flex items-center px-4 py-2.5 text-sm ${
                      isMe ? "bg-red-50" : owesMe ? "bg-emerald-50" : ""
                    }`}
                  >
                    <span className={isMe ? "font-medium text-red-700" : "text-gray-700"}>
                      {isMe ? "You" : fromName}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className={owesMe ? "font-medium text-emerald-700" : "text-gray-700"}>
                      {owesMe ? "you" : toName}
                    </span>
                    <span className="ml-auto font-medium text-gray-900">
                      {formatCurrency(s.amount, s.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Debts simplified using net balance reduction
            </span>
            {converted && (
              <span className="text-xs text-gray-400">
                Rates from{" "}
                <a
                  href="https://www.frankfurter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  frankfurter.app
                </a>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
