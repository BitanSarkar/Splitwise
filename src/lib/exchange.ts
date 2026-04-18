"use server";

export interface RatesResult {
  base: string;
  rates: Record<string, number>;
  date: string;
}

// Frankfurter.app — free, no API key, ~33 major currencies
export async function fetchRates(base: string): Promise<RatesResult> {
  const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`, {
    next: { revalidate: 3600 }, // cache for 1 hour
  });
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`);
  const data = await res.json();
  // Include the base currency itself at rate 1
  return { base, rates: { ...data.rates, [base]: 1 }, date: data.date };
}
