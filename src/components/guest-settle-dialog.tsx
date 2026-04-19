"use client";

import { useMemo, useState } from "react";
import { recordGuestSettlement } from "@/lib/actions";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Spinner } from "@/components/spinner";

// A member in this group — shape from `getGroupDetails`.
export interface GuestSettleMember {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  isGuest: boolean;
  avatarEmoji: string | null;
}

// A raw balance edge from `getGroupBalances` — "from owes to".
export interface GuestSettleBalance {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

interface Props {
  groupId: string;
  members: GuestSettleMember[];
  // All raw balances (per-currency, un-simplified) — used to suggest an
  // amount and currency when a guest is picked.
  rawBalances: GuestSettleBalance[];
}

// Dialog for recording a settlement that involves a guest — e.g. "Dad gave
// Alice ₹500 in cash" or "Alice paid Dad ₹500 for his share". Any group
// member can open this; the server enforces that at least one of from/to
// is a guest of this group.
export function GuestSettleDialog({ groupId, members, rawBalances }: Props) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const guests = useMemo(
    () => members.filter((m) => m.isGuest),
    [members]
  );

  // Currencies seen in this group, falling back to USD so the dialog is
  // usable even before any expense exists.
  const currencies = useMemo(() => {
    const s = new Set<string>();
    rawBalances.forEach((b) => s.add(b.currency));
    return Array.from(s).sort();
  }, [rawBalances]);

  function reset() {
    setFromId("");
    setToId("");
    setAmount("");
    setCurrency("");
    setNote("");
    setError("");
  }

  // When both sides are picked, suggest the sum of outstanding balance
  // between them per currency — user can override.
  function suggestFromPair(from: string, to: string) {
    if (!from || !to || from === to) return;
    const perCurrency = new Map<string, number>();
    for (const b of rawBalances) {
      if (b.from === from && b.to === to) {
        perCurrency.set(b.currency, (perCurrency.get(b.currency) ?? 0) + b.amount);
      }
    }
    if (perCurrency.size === 0) return;
    // Pick the currency with the largest outstanding amount.
    const [cur, amt] = Array.from(perCurrency.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    setCurrency(cur);
    setAmount(amt.toFixed(2));
  }

  function renderMemberOption(m: GuestSettleMember) {
    const label = m.isGuest
      ? `${m.avatarEmoji ?? "👤"} ${m.name ?? "Guest"} (guest)`
      : m.name ?? m.email ?? "Unknown";
    return (
      <option key={m.id} value={m.id}>
        {label}
      </option>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) {
      setError("Pick a different From and To");
      return;
    }
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      setError("Amount must be greater than zero");
      return;
    }
    if (!currency) {
      setError("Pick a currency");
      return;
    }
    if (!note.trim()) {
      setError("Add a short note (e.g. cash, UPI ref)");
      return;
    }

    const fromMember = members.find((m) => m.id === fromId);
    const toMember = members.find((m) => m.id === toId);
    if (!fromMember || !toMember) {
      setError("Invalid member selection");
      return;
    }
    const fromIsGuestHere =
      fromMember.isGuest; // server re-checks guestGroupId === groupId
    const toIsGuestHere = toMember.isGuest;
    if (!fromIsGuestHere && !toIsGuestHere) {
      setError(
        "At least one party must be a guest — use Settle Up for real-user settlements"
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      await recordGuestSettlement({
        groupId,
        fromUserId: fromId,
        toUserId: toId,
        amount: amt,
        currency,
        note: note.trim(),
      });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Hide the whole dialog when the group has no guests — no reason to show it.
  if (guests.length === 0) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="px-2.5 py-1.5 text-xs sm:text-sm border border-amber-400 text-amber-700 rounded-md hover:bg-amber-50 whitespace-nowrap">
          Guest Settle
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-sm max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              Record guest settlement
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <p className="text-xs text-gray-500">
              Use this to log a payment involving a guest (someone without an
              account). At least one of From or To must be a guest.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From (payer)
              </label>
              <select
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  suggestFromPair(e.target.value, toId);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              >
                <option value="">Select…</option>
                {members.map(renderMemberOption)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To (receiver)
              </label>
              <select
                value={toId}
                onChange={(e) => {
                  setToId(e.target.value);
                  suggestFromPair(fromId, e.target.value);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              >
                <option value="">Select…</option>
                {members
                  .filter((m) => m.id !== fromId)
                  .map(renderMemberOption)}
              </select>
            </div>

            {/* Outstanding hint for the chosen pair */}
            {fromId && toId && fromId !== toId && (
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-500">
                {rawBalances.some(
                  (b) => b.from === fromId && b.to === toId
                ) ? (
                  <>
                    Suggested amount is their current outstanding balance.
                  </>
                ) : (
                  <>
                    No outstanding balance between these two right now — you
                    can still record a payment if needed.
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Currency
                </label>
                {currencies.length > 0 ? (
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">—</option>
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="USD"
                    maxLength={6}
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value.toUpperCase())
                    }
                    className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {currency && amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-gray-500">
                Will record: {formatCurrency(parseFloat(amount), currency)}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Cash given, UPI ref #1234"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading && <Spinner className="h-3.5 w-3.5" />}
                {loading ? "Recording…" : "Record payment"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
