"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  groups,
  groupMembers,
  groupInvites,
  expenses,
  expenseSplits,
  settlements,
  activities,
  users,
  friendships,
} from "@/db/schema";
import { isNull } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";
import { generateId, simplifyDebts } from "@/lib/utils";
import { refresh } from "next/cache";
import { emitGroupEvent } from "@/lib/group-events";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// Groups
export async function createGroup(data: {
  name: string;
  description?: string;
  emoji?: string;
}) {
  const user = await requireAuth();
  const groupId = generateId();

  await db.insert(groups).values({
    id: groupId,
    name: data.name,
    description: data.description,
    emoji: data.emoji ?? "👥",
    createdBy: user.id!,
  });

  await db.insert(groupMembers).values({
    id: generateId(),
    groupId,
    userId: user.id!,
    role: "admin",
  });

  await db.insert(activities).values({
    id: generateId(),
    groupId,
    userId: user.id!,
    type: "group_created",
    description: `${user.name} created the group "${data.name}"`,
  });

  refresh();
  return { groupId };
}

export async function getMyGroups() {
  const user = await requireAuth();

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id!));

  if (memberRows.length === 0) return [];

  const groupIds = memberRows.map((r) => r.groupId);

  return db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds))
    .orderBy(groups.createdAt);
}

export async function getGroupDetails(groupId: string) {
  const user = await requireAuth();

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) throw new Error("Group not found");

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      isGuest: users.isGuest,
      avatarEmoji: users.avatarEmoji,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const isMember = members.some((m) => m.id === user.id);
  if (!isMember) throw new Error("Not a member of this group");

  return { group, members };
}

export async function addMemberToGroup(groupId: string, email: string) {
  const user = await requireAuth();

  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!targetUser) throw new Error("User not found. They must sign in first.");

  const existing = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, targetUser.id)
    ),
  });
  if (existing) throw new Error("User is already a member");

  await db.insert(groupMembers).values({
    id: generateId(),
    groupId,
    userId: targetUser.id,
    role: "member",
  });

  await db.insert(activities).values({
    id: generateId(),
    groupId,
    userId: user.id!,
    type: "member_added",
    description: `${user.name} added ${targetUser.name} to the group`,
  });

  // Add friendship
  const friendExists = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.userId, user.id!),
      eq(friendships.friendId, targetUser.id)
    ),
  });
  if (!friendExists) {
    await db.insert(friendships).values([
      { id: generateId(), userId: user.id!, friendId: targetUser.id },
      { id: generateId(), userId: targetUser.id, friendId: user.id! },
    ]);
  }

  refresh();
  emitGroupEvent(groupId, "member");
}

// Guests
// A guest is a member of one specific group who doesn't have (and can't get)
// a real account. They participate in expenses/splits/settlements identically
// to real users; the only differences are visual (badge + emoji avatar) and
// that they can't log in. Any existing member of the group may add a guest.
const GUEST_EMOJIS = [
  "🦊", "🐻", "🐼", "🐸", "🐙", "🦁",
  "🐯", "🐨", "🐵", "🐶", "🐱", "🐰",
  "🦉", "🦄", "🐝", "🐢", "🐳", "🐧",
];

export async function addGuestToGroup(
  groupId: string,
  name: string,
  emoji: string
) {
  const user = await requireAuth();

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Guest name is required");
  if (trimmedName.length > 50)
    throw new Error("Guest name must be 50 characters or fewer");
  if (!GUEST_EMOJIS.includes(emoji))
    throw new Error("Invalid avatar choice");

  // Caller must be a member of the group.
  const callerMembership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, user.id!)
    ),
  });
  if (!callerMembership) throw new Error("Not a member of this group");

  const guestId = generateId();

  await db.insert(users).values({
    id: guestId,
    name: trimmedName,
    email: null,
    isGuest: true,
    guestGroupId: groupId,
    avatarEmoji: emoji,
  });

  await db.insert(groupMembers).values({
    id: generateId(),
    groupId,
    userId: guestId,
    role: "member",
  });

  await db.insert(activities).values({
    id: generateId(),
    groupId,
    userId: user.id!,
    type: "guest_added",
    description: `${user.name} added guest ${emoji} ${trimmedName} to the group`,
  });

  refresh();
  emitGroupEvent(groupId, "guest");
  return { guestId };
}

// Record a settlement on behalf of a guest. At least one of {from, to} must
// be a guest belonging to this group — for real-user-to-real-user settlement,
// use the existing `settleUp` action (which is current-user-centric).
export async function recordGuestSettlement(data: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const user = await requireAuth();

  if (data.fromUserId === data.toUserId)
    throw new Error("From and To must be different members");
  if (!(data.amount > 0)) throw new Error("Amount must be greater than zero");

  // Caller must be a member of the group.
  const callerMembership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, data.groupId),
      eq(groupMembers.userId, user.id!)
    ),
  });
  if (!callerMembership) throw new Error("Not a member of this group");

  // Both sides must be members of the group.
  const sides = await db
    .select({
      id: users.id,
      name: users.name,
      isGuest: users.isGuest,
      guestGroupId: users.guestGroupId,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(
      and(
        eq(groupMembers.groupId, data.groupId),
        inArray(users.id, [data.fromUserId, data.toUserId])
      )
    );
  const from = sides.find((s) => s.id === data.fromUserId);
  const to = sides.find((s) => s.id === data.toUserId);
  if (!from || !to)
    throw new Error("Both parties must be members of this group");

  // Require at least one guest side — guest settlements belong to the guest
  // flow, real-user settlements should go through the regular Settle Up.
  const fromIsGuestHere =
    from.isGuest && from.guestGroupId === data.groupId;
  const toIsGuestHere = to.isGuest && to.guestGroupId === data.groupId;
  if (!fromIsGuestHere && !toIsGuestHere)
    throw new Error(
      "At least one party must be a guest — use Settle Up for real-user settlements"
    );

  await db.insert(settlements).values({
    id: generateId(),
    groupId: data.groupId,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    amount: data.amount,
    currency: data.currency,
    note: data.note,
  });

  await db.insert(activities).values({
    id: generateId(),
    groupId: data.groupId,
    userId: user.id!,
    type: "guest_settlement",
    description: `${user.name} recorded: ${from.name ?? "Someone"} paid ${to.name ?? "someone"} ${data.currency} ${data.amount.toFixed(2)}`,
  });

  refresh();
  emitGroupEvent(data.groupId, "settlement");
}

// Expenses
export async function addExpense(data: {
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitType: "equal" | "percentage" | "exact" | "shares";
  splits: { userId: string; value: number }[];
}) {
  const user = await requireAuth();
  const expenseId = generateId();

  const totalAmount = data.amount;
  let splitRows: { id: string; expenseId: string; userId: string; amount: number; percentage?: number; shares?: number; isPaid: boolean }[] = [];

  if (data.splitType === "equal") {
    const perPerson = totalAmount / data.splits.length;
    splitRows = data.splits.map((s) => ({
      id: generateId(),
      expenseId,
      userId: s.userId,
      amount: Math.round(perPerson * 100) / 100,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "percentage") {
    splitRows = data.splits.map((s) => ({
      id: generateId(),
      expenseId,
      userId: s.userId,
      amount: Math.round((totalAmount * s.value) / 100 * 100) / 100,
      percentage: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "exact") {
    splitRows = data.splits.map((s) => ({
      id: generateId(),
      expenseId,
      userId: s.userId,
      amount: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "shares") {
    const totalShares = data.splits.reduce((sum, s) => sum + s.value, 0);
    splitRows = data.splits.map((s) => ({
      id: generateId(),
      expenseId,
      userId: s.userId,
      amount: Math.round((totalAmount * s.value) / totalShares * 100) / 100,
      shares: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  }

  await db.insert(expenses).values({
    id: expenseId,
    groupId: data.groupId,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    paidBy: data.paidBy,
    splitType: data.splitType,
    createdBy: user.id!,
  });

  await db.insert(expenseSplits).values(splitRows);

  const paidByUser = await db.query.users.findFirst({ where: eq(users.id, data.paidBy) });
  await db.insert(activities).values({
    id: generateId(),
    groupId: data.groupId,
    userId: user.id!,
    type: "expense_added",
    description: `${user.name} added "${data.description}" (${data.currency} ${data.amount.toFixed(2)}) paid by ${paidByUser?.name ?? "someone"}`,
  });

  refresh();
  emitGroupEvent(data.groupId, "expense");
}

export async function deleteExpense(expenseId: string) {
  const user = await requireAuth();

  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
  });
  if (!expense) throw new Error("Expense not found");

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, expense.groupId), eq(groupMembers.userId, user.id!)),
  });
  if (!membership) throw new Error("Not authorized");

  await db.update(expenses).set({ isDeleted: true }).where(eq(expenses.id, expenseId));

  await db.insert(activities).values({
    id: generateId(),
    groupId: expense.groupId,
    userId: user.id!,
    type: "expense_deleted",
    description: `${user.name} deleted "${expense.description}"`,
  });

  refresh();
  emitGroupEvent(expense.groupId, "expense");
}

export async function updateExpense(
  expenseId: string,
  data: {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitType: "equal" | "percentage" | "exact" | "shares";
    splits: { userId: string; value: number }[];
  }
) {
  const user = await requireAuth();

  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
  });
  if (!expense) throw new Error("Expense not found");

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, expense.groupId), eq(groupMembers.userId, user.id!)),
  });
  if (!membership) throw new Error("Not a member of this group");

  const totalAmount = data.amount;
  let splitRows: { id: string; expenseId: string; userId: string; amount: number; percentage?: number; shares?: number; isPaid: boolean }[] = [];

  if (data.splitType === "equal") {
    const perPerson = totalAmount / data.splits.length;
    splitRows = data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: Math.round(perPerson * 100) / 100,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "percentage") {
    splitRows = data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: Math.round((totalAmount * s.value) / 100 * 100) / 100,
      percentage: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "exact") {
    splitRows = data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  } else if (data.splitType === "shares") {
    const totalShares = data.splits.reduce((sum, s) => sum + s.value, 0);
    splitRows = data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: Math.round((totalAmount * s.value) / totalShares * 100) / 100,
      shares: s.value,
      isPaid: s.userId === data.paidBy,
    }));
  }

  await db.update(expenses).set({
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    paidBy: data.paidBy,
    splitType: data.splitType,
  }).where(eq(expenses.id, expenseId));

  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  if (splitRows.length > 0) await db.insert(expenseSplits).values(splitRows);

  const paidByUser = await db.query.users.findFirst({ where: eq(users.id, data.paidBy) });
  await db.insert(activities).values({
    id: generateId(),
    groupId: expense.groupId,
    userId: user.id!,
    type: "expense_updated",
    description: `${user.name} updated "${data.description}" (${data.currency} ${data.amount.toFixed(2)}) paid by ${paidByUser?.name ?? "someone"}`,
  });

  refresh();
  emitGroupEvent(expense.groupId, "expense");
}

export async function getGroupExpenses(groupId: string) {
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
      paidByName: users.name,
      paidByImage: users.image,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.paidBy, users.id))
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)))
    .orderBy(expenses.createdAt);

  const splits = await db
    .select({
      expenseId: expenseSplits.expenseId,
      userId: expenseSplits.userId,
      amount: expenseSplits.amount,
      percentage: expenseSplits.percentage,
      shares: expenseSplits.shares,
      isPaid: expenseSplits.isPaid,
      userName: users.name,
    })
    .from(expenseSplits)
    .innerJoin(users, eq(expenseSplits.userId, users.id))
    .where(
      inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id))
    );

  return expenseRows.map((expense) => ({
    ...expense,
    splits: splits.filter((s) => s.expenseId === expense.id),
  }));
}

export async function getGroupBalances(groupId: string) {
  await requireAuth();

  const expenseRows = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy, currency: expenses.currency })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)));

  if (expenseRows.length === 0) return [];

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)));

  const settlementsRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId));

  const rawBalances: { from: string; to: string; amount: number; currency: string }[] = [];

  for (const split of splits) {
    if (split.isPaid) continue;
    const expense = expenseRows.find((e) => e.id === split.expenseId);
    if (!expense || expense.paidBy === split.userId) continue;
    rawBalances.push({ from: split.userId, to: expense.paidBy, amount: split.amount, currency: expense.currency });
  }

  for (const s of settlementsRows) {
    rawBalances.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });
  }

  return rawBalances;
}

// Settlements
export async function settleUp(data: {
  groupId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const user = await requireAuth();

  await db.insert(settlements).values({
    id: generateId(),
    groupId: data.groupId,
    fromUserId: user.id!,
    toUserId: data.toUserId,
    amount: data.amount,
    currency: data.currency,
    note: data.note,
  });

  const toUser = await db.query.users.findFirst({ where: eq(users.id, data.toUserId) });

  await db.insert(activities).values({
    id: generateId(),
    groupId: data.groupId,
    userId: user.id!,
    type: "settlement",
    description: `${user.name} paid ${toUser?.name} ${data.currency} ${data.amount.toFixed(2)}`,
  });

  refresh();
  emitGroupEvent(data.groupId, "settlement");
}

// Activity feed
export async function getGroupActivity(groupId: string, limit = 20) {
  return db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      createdAt: activities.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.groupId, groupId))
    .orderBy(sql`${activities.createdAt} DESC`)
    .limit(limit);
}

export async function getDashboardData() {
  const user = await requireAuth();

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id!));

  if (memberRows.length === 0) return { owedByCurrency: {}, oweByCurrency: {}, groups: [] };

  const groupIds = memberRows.map((r) => r.groupId);

  const myGroups = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds));

  const expenseRows = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy, groupId: expenses.groupId, currency: expenses.currency })
    .from(expenses)
    .where(and(inArray(expenses.groupId, groupIds), eq(expenses.isDeleted, false)));

  const splits =
    expenseRows.length > 0
      ? await db
          .select()
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
      : [];

  const settlementsRows =
    groupIds.length > 0
      ? await db
          .select()
          .from(settlements)
          .where(inArray(settlements.groupId, groupIds))
      : [];

  // Build raw balances across all groups (same logic as getGroupBalances)
  const rawBalances: { from: string; to: string; amount: number; currency: string }[] = [];

  for (const split of splits) {
    if (split.isPaid) continue;
    const expense = expenseRows.find((e) => e.id === split.expenseId);
    if (!expense || expense.paidBy === split.userId) continue;
    rawBalances.push({ from: split.userId, to: expense.paidBy, amount: split.amount, currency: expense.currency });
  }

  for (const s of settlementsRows) {
    rawBalances.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });
  }

  // Simplify debts and compute per-currency totals from user's perspective
  const simplified = simplifyDebts(rawBalances);

  const owedByCurrency: Record<string, number> = {}; // others owe me
  const oweByCurrency: Record<string, number> = {}; // I owe others

  for (const debt of simplified) {
    if (debt.to === user.id!) {
      owedByCurrency[debt.currency] = Math.round(((owedByCurrency[debt.currency] ?? 0) + debt.amount) * 100) / 100;
    } else if (debt.from === user.id!) {
      oweByCurrency[debt.currency] = Math.round(((oweByCurrency[debt.currency] ?? 0) + debt.amount) * 100) / 100;
    }
  }

  return { owedByCurrency, oweByCurrency, groups: myGroups };
}

export async function getDashboardChartData() {
  const user = await requireAuth();

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id!));

  if (memberRows.length === 0) {
    return { expenses: [], splits: [], settlements: [], groups: [] };
  }

  const groupIds = memberRows.map((r) => r.groupId);

  const myGroups = await db
    .select({ id: groups.id, name: groups.name, emoji: groups.emoji })
    .from(groups)
    .where(inArray(groups.id, groupIds));

  const expenseRows = await db
    .select({
      id: expenses.id,
      groupId: expenses.groupId,
      description: expenses.description,
      amount: expenses.amount,
      currency: expenses.currency,
      paidBy: expenses.paidBy,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(and(inArray(expenses.groupId, groupIds), eq(expenses.isDeleted, false)));

  const splitRows =
    expenseRows.length > 0
      ? await db
          .select({
            expenseId: expenseSplits.expenseId,
            userId: expenseSplits.userId,
            amount: expenseSplits.amount,
          })
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
      : [];

  const settlementRows = await db
    .select({
      id: settlements.id,
      groupId: settlements.groupId,
      fromUserId: settlements.fromUserId,
      toUserId: settlements.toUserId,
      amount: settlements.amount,
      currency: settlements.currency,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .where(inArray(settlements.groupId, groupIds));

  return {
    expenses: expenseRows,
    splits: splitRows,
    settlements: settlementRows,
    groups: myGroups,
    currentUserId: user.id!,
  };
}

// --- Group invites (QR) ---

export async function getOrCreateGroupInviteToken(groupId: string): Promise<string> {
  const user = await requireAuth();

  const isMember = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id!)),
  });
  if (!isMember) throw new Error("Not a group member");

  const existing = await db.query.groupInvites.findFirst({
    where: and(eq(groupInvites.groupId, groupId), isNull(groupInvites.revokedAt)),
  });
  if (existing) return existing.token;

  const token = `${generateId()}${generateId()}`.replace(/-/g, "");
  await db.insert(groupInvites).values({
    id: generateId(),
    groupId,
    token,
    createdBy: user.id!,
  });
  return token;
}

export async function joinGroupByToken(token: string): Promise<string> {
  const user = await requireAuth();

  const invite = await db.query.groupInvites.findFirst({
    where: and(eq(groupInvites.token, token), isNull(groupInvites.revokedAt)),
  });
  if (!invite) throw new Error("Invalid or expired invite");

  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, invite.groupId), eq(groupMembers.userId, user.id!)),
  });
  if (existing) return invite.groupId;

  await db.insert(groupMembers).values({
    id: generateId(),
    groupId: invite.groupId,
    userId: user.id!,
    role: "member",
  });

  await db.insert(activities).values({
    id: generateId(),
    groupId: invite.groupId,
    userId: user.id!,
    type: "member_added",
    description: `${user.name ?? user.email} joined via invite link`,
  });

  const otherMembers = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, invite.groupId));

  for (const m of otherMembers) {
    if (m.userId === user.id) continue;
    const pairExists = await db.query.friendships.findFirst({
      where: and(eq(friendships.userId, user.id!), eq(friendships.friendId, m.userId)),
    });
    if (!pairExists) {
      await db.insert(friendships).values([
        { id: generateId(), userId: user.id!, friendId: m.userId },
        { id: generateId(), userId: m.userId, friendId: user.id! },
      ]);
    }
  }

  return invite.groupId;
}

export async function getExchangeRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return { ...data.rates, [base]: 1 };
  } catch {
    return { [base]: 1 };
  }
}
