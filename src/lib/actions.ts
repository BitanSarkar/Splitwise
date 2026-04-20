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

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/**
 * Verifies the current user is authenticated AND is a member of `groupId`.
 * Returns the user + the full member list (id + name) so callers can
 * validate paidBy / split user IDs without an extra round-trip.
 */
async function requireGroupMember(groupId: string) {
  const user = await requireAuth();

  const members = await db
    .select({ id: users.id, name: users.name })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  if (!members.some((m) => m.id === user.id))
    throw new Error("Not a member of this group");

  return { user, members };
}

// ─── Input validation helpers ─────────────────────────────────────────────────

function validateString(value: string, field: string, max: number) {
  const v = value?.trim();
  if (!v) throw new Error(`${field} is required`);
  if (v.length > max) throw new Error(`${field} must be ${max} characters or fewer`);
  return v;
}

function validateAmount(amount: number, field = "Amount") {
  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0)
    throw new Error(`${field} must be a positive number`);
}

function validateCurrency(currency: string) {
  const c = currency?.trim().toUpperCase();
  if (!c || c.length < 2 || c.length > 6 || !/^[A-Z]+$/.test(c))
    throw new Error("Invalid currency code");
  return c;
}

function validateSplits(
  data: {
    splitType: string;
    splits: { userId: string; value: number }[];
    amount: number;
    paidBy: string;
  },
  memberIds: Set<string>
) {
  if (data.splits.length === 0) throw new Error("At least one person must be in the split");

  // All split users and paidBy must be group members
  if (!memberIds.has(data.paidBy))
    throw new Error("The person who paid must be a group member");
  for (const s of data.splits) {
    if (!memberIds.has(s.userId))
      throw new Error("All split participants must be group members");
  }

  if (data.splitType === "percentage") {
    const total = data.splits.reduce((sum, s) => sum + (s.value ?? 0), 0);
    if (Math.abs(total - 100) > 1)
      throw new Error(`Percentages must add up to 100% (got ${total.toFixed(1)}%)`);
  }

  if (data.splitType === "exact") {
    const total = data.splits.reduce((sum, s) => sum + (s.value ?? 0), 0);
    if (Math.abs(total - data.amount) > 0.05)
      throw new Error(`Exact amounts must add up to the total (${data.amount.toFixed(2)})`);
  }

  if (data.splitType === "shares") {
    if (data.splits.some((s) => s.value <= 0))
      throw new Error("Each share value must be greater than zero");
  }
}

// ─── Split calculation (shared by addExpense / updateExpense) ─────────────────

type SplitRow = {
  id: string; expenseId: string; userId: string;
  amount: number; percentage?: number; shares?: number; isPaid: boolean;
};

function buildSplitRows(
  expenseId: string,
  data: {
    splitType: string;
    splits: { userId: string; value: number }[];
    amount: number;
    paidBy: string;
  }
): SplitRow[] {
  const total = data.amount;

  if (data.splitType === "equal") {
    const per = Math.round((total / data.splits.length) * 100) / 100;
    return data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: per, isPaid: s.userId === data.paidBy,
    }));
  }
  if (data.splitType === "percentage") {
    return data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: Math.round((total * s.value) / 100 * 100) / 100,
      percentage: s.value, isPaid: s.userId === data.paidBy,
    }));
  }
  if (data.splitType === "exact") {
    return data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: s.value, isPaid: s.userId === data.paidBy,
    }));
  }
  if (data.splitType === "shares") {
    const totalShares = data.splits.reduce((sum, s) => sum + s.value, 0);
    return data.splits.map((s) => ({
      id: generateId(), expenseId, userId: s.userId,
      amount: Math.round((total * s.value) / totalShares * 100) / 100,
      shares: s.value, isPaid: s.userId === data.paidBy,
    }));
  }
  throw new Error("Invalid split type");
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroup(data: {
  name: string;
  description?: string;
  emoji?: string;
}) {
  const user = await requireAuth();

  const name = validateString(data.name, "Group name", 100);
  const description = data.description?.trim().slice(0, 300) ?? undefined;

  const groupId = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(groups).values({
      id: groupId, name, description,
      emoji: data.emoji ?? "👥",
      createdBy: user.id!,
    });
    await tx.insert(groupMembers).values({
      id: generateId(), groupId, userId: user.id!, role: "admin",
    });
    await tx.insert(activities).values({
      id: generateId(), groupId, userId: user.id!,
      type: "group_created",
      description: `${user.name} created the group "${name}"`,
    });
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

  return db
    .select()
    .from(groups)
    .where(inArray(groups.id, memberRows.map((r) => r.groupId)))
    .orderBy(groups.createdAt);
}

export async function getGroupDetails(groupId: string) {
  const user = await requireAuth();

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) throw new Error("Group not found");

  const members = await db
    .select({
      id: users.id, name: users.name, email: users.email,
      image: users.image, isGuest: users.isGuest,
      avatarEmoji: users.avatarEmoji, role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  if (!members.some((m) => m.id === user.id))
    throw new Error("Not a member of this group");

  return { group, members };
}

export async function addMemberToGroup(groupId: string, email: string) {
  // Caller must be a member of the group
  const { user } = await requireGroupMember(groupId);

  const targetUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!targetUser) throw new Error("User not found. They must sign in to Splitwise first.");

  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUser.id)),
  });
  if (existing) throw new Error("User is already a member");

  await db.transaction(async (tx) => {
    await tx.insert(groupMembers).values({
      id: generateId(), groupId, userId: targetUser.id, role: "member",
    });
    await tx.insert(activities).values({
      id: generateId(), groupId, userId: user.id!,
      type: "member_added",
      description: `${user.name} added ${targetUser.name} to the group`,
    });

    const friendExists = await tx.query.friendships.findFirst({
      where: and(eq(friendships.userId, user.id!), eq(friendships.friendId, targetUser.id)),
    });
    if (!friendExists) {
      await tx.insert(friendships).values([
        { id: generateId(), userId: user.id!, friendId: targetUser.id },
        { id: generateId(), userId: targetUser.id, friendId: user.id! },
      ]);
    }
  });

  refresh();
  emitGroupEvent(groupId, "member");
}

// ─── Guests ───────────────────────────────────────────────────────────────────

const GUEST_EMOJIS = [
  "🦊", "🐻", "🐼", "🐸", "🐙", "🦁",
  "🐯", "🐨", "🐵", "🐶", "🐱", "🐰",
  "🦉", "🦄", "🐝", "🐢", "🐳", "🐧",
];

export async function addGuestToGroup(groupId: string, name: string, emoji: string) {
  const { user } = await requireGroupMember(groupId);

  const trimmedName = validateString(name, "Guest name", 50);
  if (!GUEST_EMOJIS.includes(emoji)) throw new Error("Invalid avatar choice");

  const guestId = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: guestId, name: trimmedName, email: null,
      isGuest: true, guestGroupId: groupId, avatarEmoji: emoji,
    });
    await tx.insert(groupMembers).values({
      id: generateId(), groupId, userId: guestId, role: "member",
    });
    await tx.insert(activities).values({
      id: generateId(), groupId, userId: user.id!,
      type: "guest_added",
      description: `${user.name} added guest ${emoji} ${trimmedName} to the group`,
    });
  });

  refresh();
  emitGroupEvent(groupId, "guest");
  return { guestId };
}

export async function recordGuestSettlement(data: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const { user } = await requireGroupMember(data.groupId);

  if (data.fromUserId === data.toUserId)
    throw new Error("From and To must be different members");
  validateAmount(data.amount);
  const currency = validateCurrency(data.currency);

  const sides = await db
    .select({ id: users.id, name: users.name, isGuest: users.isGuest, guestGroupId: users.guestGroupId })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(and(
      eq(groupMembers.groupId, data.groupId),
      inArray(users.id, [data.fromUserId, data.toUserId])
    ));

  const from = sides.find((s) => s.id === data.fromUserId);
  const to = sides.find((s) => s.id === data.toUserId);
  if (!from || !to) throw new Error("Both parties must be members of this group");

  if (!from.isGuest && !(to.isGuest && to.guestGroupId === data.groupId))
    if (!(from.isGuest && from.guestGroupId === data.groupId))
      throw new Error("At least one party must be a guest — use Settle Up for real-user settlements");

  await db.transaction(async (tx) => {
    await tx.insert(settlements).values({
      id: generateId(), groupId: data.groupId,
      fromUserId: data.fromUserId, toUserId: data.toUserId,
      amount: data.amount, currency, note: data.note,
    });
    await tx.insert(activities).values({
      id: generateId(), groupId: data.groupId, userId: user.id!,
      type: "guest_settlement",
      description: `${user.name} recorded: ${from.name ?? "Someone"} paid ${to.name ?? "someone"} ${currency} ${data.amount.toFixed(2)}`,
    });
  });

  refresh();
  emitGroupEvent(data.groupId, "settlement");
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(data: {
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitType: "equal" | "percentage" | "exact" | "shares";
  splits: { userId: string; value: number }[];
}) {
  const { user, members } = await requireGroupMember(data.groupId);

  // Validate all inputs server-side
  const description = validateString(data.description, "Description", 500);
  validateAmount(data.amount);
  const currency = validateCurrency(data.currency);
  const memberIds = new Set(members.map((m) => m.id));
  validateSplits({ ...data, amount: data.amount, paidBy: data.paidBy }, memberIds);

  const expenseId = generateId();
  const splitRows = buildSplitRows(expenseId, data);
  const paidByName = members.find((m) => m.id === data.paidBy)?.name ?? "someone";

  await db.transaction(async (tx) => {
    await tx.insert(expenses).values({
      id: expenseId, groupId: data.groupId,
      description, amount: data.amount, currency,
      paidBy: data.paidBy, splitType: data.splitType, createdBy: user.id!,
    });
    await tx.insert(expenseSplits).values(splitRows);
    await tx.insert(activities).values({
      id: generateId(), groupId: data.groupId, userId: user.id!,
      type: "expense_added",
      description: `${user.name} added "${description}" (${currency} ${data.amount.toFixed(2)}) paid by ${paidByName}`,
    });
  });

  refresh();
  emitGroupEvent(data.groupId, "expense");
}

export async function deleteExpense(expenseId: string) {
  const user = await requireAuth();

  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!expense) throw new Error("Expense not found");

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, expense.groupId), eq(groupMembers.userId, user.id!)),
  });
  if (!membership) throw new Error("Not authorized");

  await db.transaction(async (tx) => {
    await tx.update(expenses).set({ isDeleted: true }).where(eq(expenses.id, expenseId));
    await tx.insert(activities).values({
      id: generateId(), groupId: expense.groupId, userId: user.id!,
      type: "expense_deleted",
      description: `${user.name} deleted "${expense.description}"`,
    });
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

  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!expense) throw new Error("Expense not found");

  const { members } = await requireGroupMember(expense.groupId);

  // Validate all inputs server-side
  const description = validateString(data.description, "Description", 500);
  validateAmount(data.amount);
  const currency = validateCurrency(data.currency);
  const memberIds = new Set(members.map((m) => m.id));
  validateSplits({ ...data, amount: data.amount, paidBy: data.paidBy }, memberIds);

  const splitRows = buildSplitRows(expenseId, data);
  const paidByName = members.find((m) => m.id === data.paidBy)?.name ?? "someone";

  await db.transaction(async (tx) => {
    await tx.update(expenses)
      .set({ description, amount: data.amount, currency, paidBy: data.paidBy, splitType: data.splitType })
      .where(eq(expenses.id, expenseId));
    await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
    if (splitRows.length > 0) await tx.insert(expenseSplits).values(splitRows);
    await tx.insert(activities).values({
      id: generateId(), groupId: expense.groupId, userId: user.id!,
      type: "expense_updated",
      description: `${user.name} updated "${description}" (${currency} ${data.amount.toFixed(2)}) paid by ${paidByName}`,
    });
  });

  refresh();
  emitGroupEvent(expense.groupId, "expense");
}

export async function getGroupExpenses(groupId: string) {
  // Auth + membership check
  await requireGroupMember(groupId);

  const expenseRows = await db
    .select({
      id: expenses.id, description: expenses.description,
      amount: expenses.amount, currency: expenses.currency,
      paidBy: expenses.paidBy, splitType: expenses.splitType,
      createdAt: expenses.createdAt, createdBy: expenses.createdBy,
      isDeleted: expenses.isDeleted,
      paidByName: users.name, paidByImage: users.image,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.paidBy, users.id))
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)))
    .orderBy(expenses.createdAt);

  if (expenseRows.length === 0) return [];

  const splits = await db
    .select({
      expenseId: expenseSplits.expenseId, userId: expenseSplits.userId,
      amount: expenseSplits.amount, percentage: expenseSplits.percentage,
      shares: expenseSplits.shares, isPaid: expenseSplits.isPaid,
      userName: users.name,
    })
    .from(expenseSplits)
    .innerJoin(users, eq(expenseSplits.userId, users.id))
    .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)));

  return expenseRows.map((expense) => ({
    ...expense,
    splits: splits.filter((s) => s.expenseId === expense.id),
  }));
}

export async function getGroupBalances(groupId: string) {
  // Auth + membership check
  await requireGroupMember(groupId);

  const expenseRows = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy, currency: expenses.currency })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)));

  if (expenseRows.length === 0) {
    const settlementsOnly = await db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, groupId));
    const raw: { from: string; to: string; amount: number; currency: string }[] = [];
    for (const s of settlementsOnly)
      raw.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });
    return raw;
  }

  const [splits, settlementsRows] = await Promise.all([
    db.select().from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id))),
    db.select().from(settlements).where(eq(settlements.groupId, groupId)),
  ]);

  const rawBalances: { from: string; to: string; amount: number; currency: string }[] = [];
  for (const split of splits) {
    if (split.isPaid) continue;
    const expense = expenseRows.find((e) => e.id === split.expenseId);
    if (!expense || expense.paidBy === split.userId) continue;
    rawBalances.push({ from: split.userId, to: expense.paidBy, amount: split.amount, currency: expense.currency });
  }
  for (const s of settlementsRows)
    rawBalances.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });

  return rawBalances;
}

// ─── Settlements ──────────────────────────────────────────────────────────────

export async function settleUp(data: {
  groupId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const { user, members } = await requireGroupMember(data.groupId);

  validateAmount(data.amount);
  const currency = validateCurrency(data.currency);

  const toMember = members.find((m) => m.id === data.toUserId);
  if (!toMember) throw new Error("The person you're paying must be a group member");
  if (data.toUserId === user.id) throw new Error("You cannot settle up with yourself");

  await db.transaction(async (tx) => {
    await tx.insert(settlements).values({
      id: generateId(), groupId: data.groupId,
      fromUserId: user.id!, toUserId: data.toUserId,
      amount: data.amount, currency, note: data.note,
    });
    await tx.insert(activities).values({
      id: generateId(), groupId: data.groupId, userId: user.id!,
      type: "settlement",
      description: `${user.name} paid ${toMember.name ?? "someone"} ${currency} ${data.amount.toFixed(2)}`,
    });
  });

  refresh();
  emitGroupEvent(data.groupId, "settlement");
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export async function getGroupActivity(groupId: string, limit = 20) {
  await requireGroupMember(groupId);

  return db
    .select({
      id: activities.id, type: activities.type,
      description: activities.description, createdAt: activities.createdAt,
      userName: users.name, userImage: users.image,
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.groupId, groupId))
    .orderBy(sql`${activities.createdAt} DESC`)
    .limit(limit);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  const user = await requireAuth();

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id!));

  if (memberRows.length === 0) return { owedByCurrency: {}, oweByCurrency: {}, groups: [] };

  const groupIds = memberRows.map((r) => r.groupId);

  // Parallel: groups + expenses + settlements
  const [myGroups, expenseRows, settlementsRows] = await Promise.all([
    db.select().from(groups).where(inArray(groups.id, groupIds)).orderBy(groups.createdAt),
    db.select({ id: expenses.id, paidBy: expenses.paidBy, groupId: expenses.groupId, currency: expenses.currency })
      .from(expenses)
      .where(and(inArray(expenses.groupId, groupIds), eq(expenses.isDeleted, false))),
    db.select().from(settlements).where(inArray(settlements.groupId, groupIds)),
  ]);

  const splits = expenseRows.length > 0
    ? await db.select().from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
    : [];

  const rawBalances: { from: string; to: string; amount: number; currency: string }[] = [];
  for (const split of splits) {
    if (split.isPaid) continue;
    const expense = expenseRows.find((e) => e.id === split.expenseId);
    if (!expense || expense.paidBy === split.userId) continue;
    rawBalances.push({ from: split.userId, to: expense.paidBy, amount: split.amount, currency: expense.currency });
  }
  for (const s of settlementsRows)
    rawBalances.push({ from: s.toUserId, to: s.fromUserId, amount: s.amount, currency: s.currency });

  const simplified = simplifyDebts(rawBalances);
  const owedByCurrency: Record<string, number> = {};
  const oweByCurrency: Record<string, number> = {};

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

  if (memberRows.length === 0)
    return { expenses: [], splits: [], settlements: [], groups: [], currentUserId: user.id! };

  const groupIds = memberRows.map((r) => r.groupId);

  // Parallel: groups + expenses + settlements
  const [myGroups, expenseRows, settlementRows] = await Promise.all([
    db.select({ id: groups.id, name: groups.name, emoji: groups.emoji })
      .from(groups).where(inArray(groups.id, groupIds)),
    db.select({
        id: expenses.id, groupId: expenses.groupId,
        description: expenses.description, amount: expenses.amount,
        currency: expenses.currency, paidBy: expenses.paidBy,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .where(and(inArray(expenses.groupId, groupIds), eq(expenses.isDeleted, false))),
    db.select({
        id: settlements.id, groupId: settlements.groupId,
        fromUserId: settlements.fromUserId, toUserId: settlements.toUserId,
        amount: settlements.amount, currency: settlements.currency,
        createdAt: settlements.createdAt,
      })
      .from(settlements).where(inArray(settlements.groupId, groupIds)),
  ]);

  const splitRows = expenseRows.length > 0
    ? await db.select({
        expenseId: expenseSplits.expenseId,
        userId: expenseSplits.userId,
        amount: expenseSplits.amount,
      })
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
    : [];

  return { expenses: expenseRows, splits: splitRows, settlements: settlementRows, groups: myGroups, currentUserId: user.id! };
}

// ─── Group invites ────────────────────────────────────────────────────────────

export async function getOrCreateGroupInviteToken(groupId: string): Promise<string> {
  await requireGroupMember(groupId);

  const existing = await db.query.groupInvites.findFirst({
    where: and(eq(groupInvites.groupId, groupId), isNull(groupInvites.revokedAt)),
  });
  if (existing) return existing.token;

  const token = `${generateId()}${generateId()}`.replace(/-/g, "");
  await db.insert(groupInvites).values({
    id: generateId(), groupId, token,
    createdBy: (await requireAuth()).id!,
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

  await db.transaction(async (tx) => {
    await tx.insert(groupMembers).values({
      id: generateId(), groupId: invite.groupId, userId: user.id!, role: "member",
    });
    await tx.insert(activities).values({
      id: generateId(), groupId: invite.groupId, userId: user.id!,
      type: "member_added",
      description: `${user.name ?? user.email} joined via invite link`,
    });
  });

  // Create friendships with existing members (outside transaction for performance)
  const otherMembers = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, invite.groupId));

  const friendInserts: { id: string; userId: string; friendId: string }[] = [];
  for (const m of otherMembers) {
    if (m.userId === user.id) continue;
    const pairExists = await db.query.friendships.findFirst({
      where: and(eq(friendships.userId, user.id!), eq(friendships.friendId, m.userId)),
    });
    if (!pairExists) {
      friendInserts.push(
        { id: generateId(), userId: user.id!, friendId: m.userId },
        { id: generateId(), userId: m.userId, friendId: user.id! }
      );
    }
  }
  if (friendInserts.length > 0) await db.insert(friendships).values(friendInserts);

  return invite.groupId;
}

// ─── Exchange rates ───────────────────────────────────────────────────────────

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
