# 💸 Splitwise Clone

A full-stack expense-splitting app built with **Next.js 16**, **Drizzle ORM**, **SQLite/libSQL**, and **NextAuth v5**. Supports real users, guest members (no account needed), live realtime updates via SSE, multi-currency conversion, and group invite links with QR codes.

Live: **https://splitwise.bitsar.net**

---

## Features

### Groups & Members
- Create groups with a name, description, and emoji
- Add real members by email (must have signed in at least once)
- Add **guest members** — people without an account (e.g. family, cash-only friends)
  - Name + emoji avatar (18 options)
  - Guests appear in balances and expense splits just like regular members
  - Guest-specific settlement flow for recording offline payments
- Invite link + QR code — anyone with the link can join (requires sign-in)
- Role system: admin vs member

### Expenses
- Add expenses with description, amount, currency, and paid-by
- Four split types:
  - **Equal** — divide evenly among selected members
  - **Percentage** — each member owes a % of the total
  - **Exact** — specify exact amounts per member
  - **Shares** — divide by weighted shares
- Edit and soft-delete expenses
- Multi-currency: each expense tracks its own currency

### Balances
- **Simplified "Who owes whom"** — net balance simplification reduces N flows to minimum payments
- **Live currency conversion** via [frankfurter.app](https://www.frankfurter.app) (USD, EUR, GBP, INR, JPY, and other major currencies)
- **All balances page** (`/groups/[id]/balances`) — full pairwise breakdown per member per currency, net-per-pair toggle, gross flow drill-down, guest-aware avatars
- Balance strip showing your personal net position (owed vs. owing)

### Settlements
- **Settle Up** — record a payment from the current user to another real member
- **Guest Settle** — record a cash/offline payment involving a guest (visible only when the group has at least one guest)
- Both settlement types affect balances immediately

### Realtime Updates (SSE)
- Every open tab subscribes to `/api/groups/[id]/events` via Server-Sent Events
- Any mutation (expense add/edit/delete, settlement, member added) broadcasts to all connected tabs
- Tabs call `router.refresh()` on event — data updates without page reload
- Background tabs pause and catch up on re-focus
- 25-second heartbeat keeps connections alive through proxies

### Charts & Analytics
- Cumulative spending over time
- Daily spending bar chart
- Paid vs. consumed per member
- Net balance per member
- Split-type distribution (pie chart)
- Settlements over time
- All charts scoped to a selected display currency

### Export
- Download group balance sheet as Excel (`.xlsx`)
- Includes member list, expense breakdown, simplified settlement suggestions

### Activity Feed
- Chronological log of all group actions (expense added/updated/deleted, settlement, member added, guest added)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript |
| Auth | [NextAuth v5 beta](https://authjs.dev) (Google OAuth) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Database | SQLite via [libSQL](https://github.com/tursodatabase/libsql) |
| Styling | Tailwind CSS v4 |
| Charts | [Recharts](https://recharts.org) |
| UI Primitives | [Radix UI](https://www.radix-ui.com) |
| QR Codes | [qrcode](https://www.npmjs.com/package/qrcode) |
| Excel Export | [xlsx](https://sheetjs.com) |
| Realtime | Native `EventSource` (SSE) + Node.js `EventEmitter` |
| Server | AWS EC2 t4g.micro (ARM Graviton), nginx, pm2 |
| HTTPS | Let's Encrypt via certbot |
| HTTP Protocol | HTTP/2 + HTTP/3 (QUIC) via nginx mainline |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated layout
│   │   ├── dashboard/            # Home — your groups + cross-group balances
│   │   └── groups/
│   │       ├── [groupId]/
│   │       │   ├── page.tsx      # Group detail (expenses, balances, charts)
│   │       │   └── balances/
│   │       │       └── page.tsx  # Full pairwise balance breakdown
│   │       └── new/              # Create group form
│   ├── api/
│   │   └── groups/[groupId]/
│   │       ├── events/           # SSE stream endpoint
│   │       └── export/           # Excel export
│   ├── join/[token]/             # Invite link landing page
│   └── signin/                   # Sign-in page
├── components/
│   ├── add-expense-dialog.tsx
│   ├── add-member-dialog.tsx     # Email add + guest add + QR invite
│   ├── balance-display.tsx       # Simplified who-owes-whom + currency convert
│   ├── detailed-balances.tsx     # Full pairwise breakdown with guest avatars
│   ├── edit-expense-dialog.tsx
│   ├── expense-list.tsx
│   ├── group-charts.tsx
│   ├── group-realtime.tsx        # SSE subscriber → router.refresh()
│   ├── guest-settle-dialog.tsx
│   └── settle-up-dialog.tsx
├── db/
│   ├── index.ts                  # Drizzle client (libSQL)
│   ├── schema.ts                 # All table definitions
│   └── migrate.ts                # Idempotent production migration runner
└── lib/
    ├── actions.ts                # All server actions
    ├── group-events.ts           # In-process EventEmitter for SSE pub/sub
    ├── utils.ts                  # simplifyDebts, formatCurrency, etc.
    └── currencies.ts             # Frankfurter-supported currency list
```

---

## Database Schema

```
users              — real accounts + guest rows (isGuest=true, email=null)
accounts           — NextAuth OAuth accounts
sessions           — NextAuth sessions
verification_tokens
groups             — group metadata (name, emoji, description)
group_members      — group ↔ user join (role: admin | member)
group_invites      — shareable invite tokens with revoke support
expenses           — expense records (amount, currency, splitType, paidBy)
expense_splits     — per-member split rows (amount, %, shares, isPaid)
settlements        — recorded payments (real user or guest)
activities         — audit log of all group events
friendships        — friend graph built as members join shared groups
```

Guest rows live in the `users` table (`isGuest=true`, `guestGroupId` set, `email=null`) so all existing balance, split, and settlement queries work unchanged.

---

## Local Development

### Prerequisites
- Node.js 20+
- A Google OAuth app ([console.cloud.google.com](https://console.cloud.google.com))

### Setup

```bash
git clone https://github.com/BitanSarkar/Splitwise.git
cd Splitwise
npm install
```

Create `.env.local`:

```env
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<your Google client ID>
AUTH_GOOGLE_SECRET=<your Google client secret>
TURSO_DATABASE_URL=file:./local.db
# TURSO_AUTH_TOKEN=   ← not needed for local file DB
```

```bash
npm run db:push      # create schema in local.db
npm run dev          # start dev server on http://localhost:3000
```

### Database scripts

| Command | Description |
|---|---|
| `npm run db:push` | Push schema directly (dev only — interactive) |
| `npm run db:migrate` | Run idempotent production migrations (safe for CI/CD) |
| `npm run db:generate` | Generate SQL migration files from schema diff |
| `npm run db:studio` | Open Drizzle Studio GUI |

---

## Production Deployment

### Infrastructure
- **EC2** t4g.micro (ARM Graviton2, 1 vCPU, 1 GB RAM) — AWS free tier
- **EBS** gp3 30 GB (8 GB root + 22 GB data volume mounted at `/mnt/data`)
- **SQLite** DB at `/mnt/data/db/local.db`
- **nginx** mainline (1.29+) with HTTP/2 + HTTP/3/QUIC
- **pm2** process manager (`instances: 1`, `exec_mode: cluster`)
- **Let's Encrypt** TLS via certbot

### Deploy

```bash
cd app
git pull
npm ci
npm run db:migrate   # safe, idempotent — skips already-applied migrations
npm run build
pm2 restart splitwise --update-env
```

### Adding future schema changes

1. Edit `src/db/schema.ts`
2. Append a new entry to the `MIGRATIONS` array in `src/db/migrate.ts`:

```ts
{
  id: "0002_my_change",
  statements: [
    `ALTER TABLE some_table ADD COLUMN new_col TEXT`,
  ],
},
```

3. Commit and deploy — `db:migrate` will run the new entry once and skip it on all subsequent deploys.

### DB Backup

Daily cron at 3 AM backs up the SQLite file using `.backup` (safe while the app is running), keeping the last 3 snapshots:

```bash
# /home/ubuntu/backup-db.sh
BACKUP_DIR=/mnt/data/backups
DB_PATH=/mnt/data/db/local.db
mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/backup-$(date +%Y%m%d).db"
ls -t "$BACKUP_DIR"/backup-*.db | tail -n +4 | xargs -r rm

# crontab
0 3 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

---

## SSE Realtime Architecture

```
User A records a settlement
        │
        ▼
  Server Action (actions.ts)
        │
        ├─► refresh()            — refreshes User A's own tab via Next.js
        │
        └─► emitGroupEvent(groupId, "settlement")
                  │
                  ▼
          group-events.ts (EventEmitter, in-process)
                  │
          ┌───────┴────────┐
          ▼                ▼
    User B's SSE     User C's SSE       (all open tabs)
    /api/.../events  /api/.../events
          │                │
          ▼                ▼
    router.refresh()  router.refresh()  — re-fetches RSC payload
```

> **Note:** The EventEmitter is in-process. This works correctly because `ecosystem.config.js` runs a single Next.js instance (`instances: 1`). If you scale to multiple processes, replace `group-events.ts` with Redis pub/sub — the `emitGroupEvent` / `subscribeGroupEvents` API is the only surface that needs to change.

---

## License

MIT
