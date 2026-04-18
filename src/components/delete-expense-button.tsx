"use client";

import { deleteExpense } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  expenseId: string;
}

export function DeleteExpenseButton({ expenseId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteExpense(expenseId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
