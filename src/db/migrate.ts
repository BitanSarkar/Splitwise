/**
 * Safe incremental migration runner for production.
 *
 * Drizzle's `db:push` is great for dev but interactive-prompts and
 * table-recreation make it awkward in CI/CD.  This script instead runs raw
 * SQL that is idempotent — safe to re-run on every deploy, will no-op when
 * columns already exist.
 *
 * How to add future migrations: append a new entry to `MIGRATIONS` with a
 * unique `id` string.  The script tracks which ids have already run in the
 * `_migrations` table and skips them on subsequent deploys.
 *
 * Usage:  npx tsx src/db/migrate.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

// ─── migration registry ────────────────────────────────────────────────────
// Each entry runs once (tracked by `id` in `_migrations`).
// Statements within a migration run in order inside one transaction.
const MIGRATIONS: { id: string; statements: string[] }[] = [
  {
    id: "0001_guest_members",
    statements: [
      // Disable FK checks — other tables reference `users` so we can't drop
      // it while FK enforcement is on.  We re-enable after the rename.
      `PRAGMA foreign_keys = OFF`,

      // Make email nullable + add guest columns.
      // SQLite can't ALTER COLUMN, so we recreate the table.
      // Steps: create new → copy data → drop old → rename new.
      `CREATE TABLE IF NOT EXISTS users_new (
        id             TEXT PRIMARY KEY NOT NULL,
        name           TEXT,
        email          TEXT UNIQUE,
        email_verified INTEGER,
        image          TEXT,
        is_guest       INTEGER NOT NULL DEFAULT 0,
        guest_group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
        avatar_emoji   TEXT,
        created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`,

      // Copy existing rows. All new columns (is_guest, guest_group_id,
      // avatar_emoji, created_at) may not exist on the old table, so we use
      // literal defaults rather than selecting them.
      `INSERT OR IGNORE INTO users_new
         (id, name, email, email_verified, image,
          is_guest, guest_group_id, avatar_emoji, created_at)
       SELECT
         id, name, email, email_verified, image,
         0,    -- is_guest: existing users are never guests
         NULL, -- guest_group_id
         NULL, -- avatar_emoji
         strftime('%s', 'now') * 1000
       FROM users`,

      `DROP TABLE users`,
      `ALTER TABLE users_new RENAME TO users`,

      // Restore FK enforcement.
      `PRAGMA foreign_keys = ON`,
    ],
  },
];

// ─── runner ───────────────────────────────────────────────────────────────
async function run() {
  // Bootstrap the tracking table.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);

  const { rows } = await client.execute(`SELECT id FROM _migrations`);
  const applied = new Set(rows.map((r) => r[0] as string));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) {
      console.log(`  skip  ${migration.id}`);
      continue;
    }

    console.log(`  run   ${migration.id}`);
    for (const sql of migration.statements) {
      await client.execute(sql);
    }
    await client.execute({
      sql: `INSERT INTO _migrations (id) VALUES (?)`,
      args: [migration.id],
    });
    console.log(`  done  ${migration.id}`);
  }

  console.log("All migrations applied.");
  await client.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
