import { sql } from "drizzle-orm";
import {
  text,
  integer,
  real,
  sqliteTable,
} from "drizzle-orm/sqlite-core";

// NextAuth required tables
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
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

export const groupMembers = sqliteTable("group_members", {
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
});

export const expenses = sqliteTable("expenses", {
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
});

export const expenseSplits = sqliteTable("expense_splits", {
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
});

export const settlements = sqliteTable("settlements", {
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
});

export const activities = sqliteTable("activities", {
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
    ],
  }).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

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
