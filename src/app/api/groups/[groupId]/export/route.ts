import { auth } from "@/auth";
import { db } from "@/db";
import { groups, groupMembers, expenses, expenseSplits, settlements, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { simplifyDebts } from "@/lib/utils";
import * as XLSX from "xlsx";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) return new Response("Not found", { status: 404 });

  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const isMember = memberRows.some((m) => m.id === session.user!.id);
  if (!isMember) return new Response("Forbidden", { status: 403 });

  const memberMap = new Map(memberRows.map((m) => [m.id, m.name ?? m.email]));
  const nameOf = (id: string) => memberMap.get(id) ?? id;

  const expenseRows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      currency: expenses.currency,
      paidBy: expenses.paidBy,
      splitType: expenses.splitType,
      createdAt: expenses.createdAt,
      createdBy: expenses.createdBy,
      isDeleted: expenses.isDeleted,
    })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)))
    .orderBy(expenses.createdAt);

  const splitRows =
    expenseRows.length > 0
      ? await db
          .select()
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
      : [];

  const settlementRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(settlements.createdAt);

  // Build raw balances and simplify
  const rawBalances: { from: string; to: string; amount: number; currency: string }[] = [];
  for (const s of splitRows) {
    if (s.isPaid) continue;
    const e = expenseRows.find((x) => x.id === s.expenseId);
    if (!e || e.paidBy === s.userId) continue;
    rawBalances.push({ from: s.userId, to: e.paidBy, amount: s.amount, currency: e.currency });
  }
  for (const s of settlementRows) {
    rawBalances.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });
  }
  const simplified = simplifyDebts(rawBalances);

  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : "";

  // --- Sheet: Summary
  const totalByCurrency = new Map<string, number>();
  for (const e of expenseRows) {
    totalByCurrency.set(e.currency, (totalByCurrency.get(e.currency) ?? 0) + e.amount);
  }
  const summaryRows: (string | number)[][] = [
    ["Group", group.name],
    ["Description", group.description ?? ""],
    ["Created", fmtDate(group.createdAt)],
    ["Members", memberRows.length],
    ["Expenses (active)", expenseRows.length],
    ["Settlements", settlementRows.length],
    [],
    ["Total spend by currency"],
    ...Array.from(totalByCurrency.entries()).map(
      ([c, v]) => [c, Math.round(v * 100) / 100] as (string | number)[]
    ),
    [],
    ["Generated at", new Date().toISOString()],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 40 }];

  // --- Sheet: Members
  const membersSheet = XLSX.utils.json_to_sheet(
    memberRows.map((m) => ({
      Name: m.name ?? "",
      Email: m.email,
      Role: m.role,
      Joined: fmtDate(m.joinedAt),
    }))
  );
  membersSheet["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 22 }];

  // --- Sheet: Expenses
  const expensesSheet = XLSX.utils.json_to_sheet(
    expenseRows.map((e) => ({
      Date: fmtDate(e.createdAt),
      Description: e.description,
      Currency: e.currency,
      Amount: e.amount,
      "Paid By": nameOf(e.paidBy),
      "Split Type": e.splitType,
      "Created By": nameOf(e.createdBy),
    }))
  );
  expensesSheet["!cols"] = [
    { wch: 20 }, { wch: 32 }, { wch: 10 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 20 },
  ];

  // --- Sheet: Splits
  const splitsSheet = XLSX.utils.json_to_sheet(
    splitRows.map((s) => {
      const e = expenseRows.find((x) => x.id === s.expenseId);
      return {
        Date: fmtDate(e?.createdAt ?? null),
        Expense: e?.description ?? "",
        Currency: e?.currency ?? "",
        Member: nameOf(s.userId),
        Share: s.amount,
        Percentage: s.percentage ?? "",
        Shares: s.shares ?? "",
        Paid: s.isPaid ? "Yes" : "No",
      };
    })
  );
  splitsSheet["!cols"] = [
    { wch: 20 }, { wch: 32 }, { wch: 10 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
  ];

  // --- Sheet: Settlements
  const settlementsSheet = XLSX.utils.json_to_sheet(
    settlementRows.map((s) => ({
      Date: fmtDate(s.createdAt),
      From: nameOf(s.fromUserId),
      To: nameOf(s.toUserId),
      Currency: s.currency,
      Amount: s.amount,
      Note: s.note ?? "",
    }))
  );
  settlementsSheet["!cols"] = [
    { wch: 20 }, { wch: 22 }, { wch: 22 },
    { wch: 10 }, { wch: 12 }, { wch: 40 },
  ];

  // --- Sheet: Balance sheet (simplified who-owes-whom)
  const balanceSheet = XLSX.utils.json_to_sheet(
    simplified.length === 0
      ? [{ From: "All settled", To: "", Currency: "", Amount: "" }]
      : simplified.map((s) => ({
          From: nameOf(s.from),
          To: nameOf(s.to),
          Currency: s.currency,
          Amount: s.amount,
        }))
  );
  balanceSheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 12 }];

  // --- Sheet: Per-member net balance
  const netByUserCurrency = new Map<string, number>();
  for (const e of expenseRows) {
    const key = `${e.paidBy}|${e.currency}`;
    netByUserCurrency.set(key, (netByUserCurrency.get(key) ?? 0) + e.amount);
  }
  for (const s of splitRows) {
    const e = expenseRows.find((x) => x.id === s.expenseId);
    if (!e) continue;
    const key = `${s.userId}|${e.currency}`;
    netByUserCurrency.set(key, (netByUserCurrency.get(key) ?? 0) - s.amount);
  }
  for (const s of settlementRows) {
    const fromKey = `${s.fromUserId}|${s.currency}`;
    const toKey = `${s.toUserId}|${s.currency}`;
    netByUserCurrency.set(fromKey, (netByUserCurrency.get(fromKey) ?? 0) + s.amount);
    netByUserCurrency.set(toKey, (netByUserCurrency.get(toKey) ?? 0) - s.amount);
  }
  const netRows = Array.from(netByUserCurrency.entries())
    .filter(([, v]) => Math.abs(v) >= 0.01)
    .map(([key, v]) => {
      const [uid, cur] = key.split("|");
      return {
        Member: nameOf(uid),
        Currency: cur,
        "Net Balance": Math.round(v * 100) / 100,
        Status: v > 0 ? "Owed to them" : "Owes",
      };
    })
    .sort((a, b) => a.Member.localeCompare(b.Member));
  const netSheet = XLSX.utils.json_to_sheet(
    netRows.length === 0 ? [{ Member: "All settled", Currency: "", "Net Balance": "", Status: "" }] : netRows
  );
  netSheet["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(wb, netSheet, "Member Balances");
  XLSX.utils.book_append_sheet(wb, balanceSheet, "Simplified Debts");
  XLSX.utils.book_append_sheet(wb, expensesSheet, "Expenses");
  XLSX.utils.book_append_sheet(wb, splitsSheet, "Splits");
  XLSX.utils.book_append_sheet(wb, settlementsSheet, "Settlements");
  XLSX.utils.book_append_sheet(wb, membersSheet, "Members");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const safeName = group.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const filename = `splitwise_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
