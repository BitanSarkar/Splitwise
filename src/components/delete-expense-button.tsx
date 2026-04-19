"use client";

import { deleteExpense } from "@/lib/actions";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/spinner";

interface Props {
  expenseId: string;
}

export function DeleteExpenseButton({ expenseId }: Props) {
  const [state, setState] = useState<"idle" | "confirm" | "loading">("idle");

  async function handleDelete() {
    setState("loading");
    try {
      await deleteExpense(expenseId);
    } catch {
      setState("idle");
    }
  }

  if (state === "confirm") {
    return (
      <span className="inline-flex items-center gap-1" style={{ animation: "dialog-in 150ms ease-out both" }}>
        <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3" />
          Delete?
        </span>
        <button
          onClick={handleDelete}
          className="h-6 px-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 font-medium"
        >
          Yes
        </button>
        <button
          onClick={() => setState("idle")}
          className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  if (state === "loading") {
    return (
      <span className="h-7 w-7 flex items-center justify-center">
        <Spinner className="h-3.5 w-3.5 text-red-400" />
      </span>
    );
  }

  return (
    <button
      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      onClick={() => setState("confirm")}
      title="Delete expense"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
