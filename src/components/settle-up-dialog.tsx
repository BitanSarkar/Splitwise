"use client";

import { useState } from "react";
import { settleUp } from "@/lib/actions";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Spinner } from "@/components/spinner";
import { dialogContentClass, DragHandle } from "@/components/dialog-primitives";

interface Settlement {
  from: string; to: string; amount: number; currency: string;
  fromName?: string; toName?: string;
}

interface Props {
  groupId: string;
  settlements: Settlement[];
  currentUserId: string;
}

export function SettleUpDialog({ groupId, settlements, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Settlement | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mine = settlements.filter((s) => s.from === currentUserId);

  function reset() {
    setSelected(null); setPayAmount("");
    setNote(""); setError("");
  }

  function selectSettlement(s: Settlement) {
    setSelected(s);
    setPayAmount(s.amount.toFixed(2));
  }

  async function handleSettle() {
    if (!selected || !note.trim()) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true); setError("");
    try {
      await settleUp({ groupId, toUserId: selected.to, amount, currency: selected.currency, note: note.trim() });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Dialog.Trigger asChild>
        <button className="px-2.5 py-1.5 text-xs sm:text-sm border border-emerald-500 text-emerald-600 rounded-md hover:bg-emerald-50 whitespace-nowrap">
          Settle Up
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className={dialogContentClass}>
          <DragHandle />
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">Settle Up</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-4">
            {mine.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-gray-700">You&apos;re all settled up!</p>
                <p className="text-xs text-gray-400 mt-1">You don&apos;t owe anyone in this group.</p>
              </div>
            ) : !selected ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Select who you&apos;re paying:</p>
                {mine.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSettlement(s)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">Pay {s.toName}</p>
                    <p className="text-sm font-semibold text-red-500">{formatCurrency(s.amount, s.currency)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">Paying <span className="font-medium text-gray-800">{selected.toName}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Original debt: {formatCurrency(selected.amount, selected.currency)}
                  </p>
                </div>

                {/* Amount (currency fixed to the debt's currency) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount paid <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="w-20 flex-shrink-0 px-3 py-2 text-sm border border-gray-200 bg-gray-50 text-gray-600 rounded-md text-center font-medium">
                      {selected.currency}
                    </div>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Settle in {selected.currency} to match the debt. To pay in another currency, edit the expense first.</p>
                </div>

                {/* Payment proof — required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment proof / method <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash, UPI ref #1234, screenshot sent, Venmo…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Required — helps the other person verify the payment.</p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setSelected(null); setPayAmount(""); }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSettle}
                    disabled={loading || !note.trim() || !payAmount}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {loading && <Spinner className="h-3.5 w-3.5" />}
                    {loading ? "Recording…" : "Record Payment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
