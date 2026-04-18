import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: Date | number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function generateId() {
  return crypto.randomUUID();
}

// Most-used currency by transaction count; ties broken by highest total value
export function getDominantCurrency(balances: RawBalance[]): string {
  if (balances.length === 0) return "USD";

  const stats = new Map<string, { count: number; total: number }>();
  for (const b of balances) {
    const s = stats.get(b.currency) ?? { count: 0, total: 0 };
    stats.set(b.currency, { count: s.count + 1, total: s.total + b.amount });
  }

  let dominant = "USD";
  let maxCount = 0;
  let maxTotal = 0;
  for (const [currency, { count, total }] of stats.entries()) {
    if (count > maxCount || (count === maxCount && total > maxTotal)) {
      dominant = currency;
      maxCount = count;
      maxTotal = total;
    }
  }
  return dominant;
}

export interface RawBalance {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

function simplifyGroup(
  balances: { from: string; to: string; amount: number }[]
): { from: string; to: string; amount: number }[] {
  const net = new Map<string, number>();

  for (const { from, to, amount } of balances) {
    net.set(from, (net.get(from) ?? 0) - amount);
    net.set(to, (net.get(to) ?? 0) + amount);
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of net.entries()) {
    if (balance > 0.01) creditors.push({ id, amount: balance });
    else if (balance < -0.01) debtors.push({ id, amount: -balance });
  }

  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    result.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount * 100) / 100 });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return result;
}

// Simplify per currency — no conversion
export function simplifyDebts(balances: RawBalance[]): SimplifiedDebt[] {
  const byCurrency = new Map<string, { from: string; to: string; amount: number }[]>();

  for (const b of balances) {
    if (!byCurrency.has(b.currency)) byCurrency.set(b.currency, []);
    byCurrency.get(b.currency)!.push({ from: b.from, to: b.to, amount: b.amount });
  }

  const results: SimplifiedDebt[] = [];
  for (const [currency, debts] of byCurrency.entries()) {
    for (const s of simplifyGroup(debts)) {
      results.push({ ...s, currency });
    }
  }
  return results;
}

// Convert all debts to a target currency using provided rates, then simplify.
// rates come from getExchangeRates(targetCurrency), so rates[X] = "1 target = X units"
// To convert FROM b.currency TO target: amount / rates[b.currency]
// e.g. base=INR, rates["USD"]=0.012 → 1 INR = 0.012 USD → 1 USD = 1/0.012 = 83.3 INR
export function simplifyDebtsConverted(
  balances: RawBalance[],
  rates: Record<string, number>,
  targetCurrency: string
): SimplifiedDebt[] {
  const converted = balances.map((b) => {
    const rate = rates[b.currency];
    return {
      from: b.from,
      to: b.to,
      amount: rate ? b.amount / rate : b.amount,
    };
  });

  return simplifyGroup(converted).map((s) => ({
    ...s,
    amount: Math.round(s.amount * 100) / 100,
    currency: targetCurrency,
  }));
}
