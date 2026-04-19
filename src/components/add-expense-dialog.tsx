"use client";

import { useState } from "react";
import { addExpense } from "@/lib/actions";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CurrencySelect } from "@/components/currency-select";

type Member = { id: string; name: string | null; email: string | null };
type SplitType = "equal" | "percentage" | "exact" | "shares";

interface Props {
  groupId: string;
  members: Member[];
  currentUserId: string;
}

export function AddExpenseDialog({ groupId, members, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.id));
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setDescription(""); setAmount(""); setCurrency("USD"); setPaidBy(currentUserId);
    setSplitType("equal"); setSelectedMembers(members.map((m) => m.id));
    setSplitValues({}); setError("");
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!description || isNaN(amountNum) || amountNum <= 0 || selectedMembers.length === 0) return;
    setLoading(true);
    setError("");
    try {
      await addExpense({
        groupId, description, amount: amountNum, currency, paidBy, splitType,
        splits: selectedMembers.map((userId) => ({
          userId,
          value: splitType === "equal" ? 1 : parseFloat(splitValues[userId] ?? "0"),
        })),
      });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const splitUnit = splitType === "percentage" ? "%" : splitType === "exact" ? "$" : splitType === "shares" ? "sh" : null;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Dialog.Trigger asChild>
        <button className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-emerald-700 whitespace-nowrap">
          + Expense
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-md max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">Add Expense</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Dinner, Groceries..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="flex gap-2">
                <div className="w-24 flex-shrink-0">
                  <CurrencySelect value={currency} onChange={setCurrency} compact />
                </div>
                <input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}{m.id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Split</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
              >
                <option value="equal">Equally</option>
                <option value="percentage">By percentage (%)</option>
                <option value="exact">By exact amount ($)</option>
                <option value="shares">By shares</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Split between</label>
              <div className="space-y-1.5">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`m-${member.id}`}
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    <label htmlFor={`m-${member.id}`} className="flex-1 text-sm text-gray-700">
                      {member.name ?? member.email}{member.id === currentUserId ? " (you)" : ""}
                    </label>
                    {splitUnit && selectedMembers.includes(member.id) && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0"
                          step={splitType === "shares" ? "1" : "0.01"}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={splitValues[member.id] ?? ""}
                          onChange={(e) => setSplitValues((p) => ({ ...p, [member.id]: e.target.value }))}
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-400 w-4">{splitUnit}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
