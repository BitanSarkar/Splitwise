import { sql } from "drizzle-orm";
import {
  text,
  integer,
  real,
  sqliteTable,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// NextAuth required tables
// Note: this table also holds "guest" rows — members added to a group who
// don't have a real account. They share the users table so all existing
// queries (expenses, splits, settlements, balances) work unchanged. Guests
// are distinguished by `isGuest = true` and belong to exactly one group via
// `guestGroupId`. Their `email` is null (email is nullable to allow this),
// so they cannot sign in (no matching accounts row).
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  isGuest: integer("is_guest", { mode: "boolean" }).default(false).notNull(),
  // Only set for guest rows — the group they were added to. Cascade delete
  // with the group so orphan guests don't linger after a group is deleted.
  guestGroupId: text("guest_group_id").references(
    (): AnySQLiteColumn => groups.id,
    { onDelete: "cascade" }
  ),
  // Emoji chosen by whoever added the guest, used as an avatar.
  avatarEmoji: text("avatar_emoji"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

export const accounts = sqliteTable("accounts", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// App tables
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").default("👥"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member"] }).default("member").notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .default(sql`(strftime('%s', 'now') * 1000)`)
      .notNull(),
  },
  (t) => [
    index("idx_group_members_group_id").on(t.groupId),
    index("idx_group_members_user_id").on(t.userId),
  ]
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").default("USD").notNull(),
    paidBy: text("paid_by")
      .notNull()
      .references(() => users.id),
    splitType: text("split_type", {
      enum: ["equal", "percentage", "exact", "shares"],
    })
      .default("equal")
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(strftime('%s', 'now') * 1000)`)
      .notNull(),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
    isDeleted: integer("is_deleted", { mode: "boolean" }).default(false).notNull(),
  },
  (t) => [index("idx_expenses_group_id").on(t.groupId)]
);

export const expenseSplits = sqliteTable(
  "expense_splits",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    amount: real("amount").notNull(),
    percentage: real("percentage"),
    shares: integer("shares"),
    isPaid: integer("is_paid", { mode: "boolean" }).default(false).notNull(),
  },
  (t) => [index("idx_expense_splits_expense_id").on(t.expenseId)]
);

export const settlements = sqliteTable(
  "settlements",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id),
    amount: real("amount").notNull(),
    currency: text("currency").default("USD").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(strftime('%s', 'now') * 1000)`)
      .notNull(),
  },
  (t) => [index("idx_settlements_group_id").on(t.groupId)]
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id),
    type: text("type", {
      enum: [
        "expense_added",
        "expense_updated",
        "expense_deleted",
        "settlement",
        "member_added",
        "group_created",
        "guest_added",
        "guest_settlement",
      ],
    }).notNull(),
    description: text("description").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(strftime('%s', 'now') * 1000)`)
      .notNull(),
  },
  (t) => [
    index("idx_activities_group_id").on(t.groupId),
    index("idx_activities_created_at").on(t.createdAt),
  ]
);

export const groupInvites = sqliteTable("group_invites", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
});

export const friendships = sqliteTable("friendships", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  friendId: text("friend_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});
