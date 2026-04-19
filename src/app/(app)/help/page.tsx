import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

function Section({ id, emoji, title, children }: { id: string; emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
      <span className="text-base flex-shrink-0 mt-px">💡</span>
      <p className="text-sm text-emerald-800 leading-relaxed">{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <span className="text-base flex-shrink-0 mt-px">ℹ️</span>
      <p className="text-sm text-blue-800 leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <span className="text-base flex-shrink-0 mt-px">⚠️</span>
      <p className="text-sm text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
        <div className="text-sm text-gray-600 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

function SplitExample({ type, label, example, detail }: { type: string; label: string; example: string; detail: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{type}</span>
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <p className="text-sm text-emerald-700 font-medium">{example}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}

const TOC = [
  { id: "quickstart", emoji: "🚀", label: "Quick Start" },
  { id: "groups", emoji: "👥", label: "Groups & Members" },
  { id: "expenses", emoji: "💳", label: "Adding Expenses" },
  { id: "split-types", emoji: "➗", label: "Split Types" },
  { id: "guests", emoji: "🦊", label: "Guest Members" },
  { id: "balances", emoji: "⚖️", label: "Balances" },
  { id: "settle", emoji: "💸", label: "Settling Up" },
  { id: "realtime", emoji: "⚡", label: "Live Updates" },
  { id: "invite", emoji: "🔗", label: "Invite Links & QR" },
  { id: "charts", emoji: "📊", label: "Charts & Analytics" },
  { id: "export", emoji: "📥", label: "Export" },
  { id: "tips", emoji: "🏆", label: "Tips & Tricks" },
];

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">📖 How to use Splitwise</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Everything you need to know — from your first group to settling up with guests.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">On this page</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm text-emerald-700 hover:underline flex items-center gap-1.5"
            >
              <span>{item.emoji}</span>
              {item.label}
              <ArrowRight className="h-3 w-3 opacity-50" />
            </a>
          ))}
        </div>
      </div>

      {/* ── QUICK START ────────────────────────────────────────────────── */}
      <Section id="quickstart" emoji="🚀" title="Quick Start">
        <p className="text-sm text-gray-600 leading-relaxed">
          New here? You can be up and running in under two minutes. Here&apos;s the fastest path:
        </p>
        <div className="border-l-2 border-emerald-200 pl-4 space-y-0">
          <Step n={1} title="Create a group">
            <p>Click <strong>+ New Group</strong> on the dashboard. Give it a name (e.g. &quot;Thai Trip&quot;), pick an emoji, and optionally add a description.</p>
          </Step>
          <Step n={2} title="Add your friends">
            <p>Inside the group, click <strong>+ Member</strong>. You can add people by email (they must have signed in once) or generate a shareable invite link / QR code so they can join themselves.</p>
            <p>For people without an account, use <strong>Add a guest</strong> instead.</p>
          </Step>
          <Step n={3} title="Log an expense">
            <p>Click <strong>+ Expense</strong>, fill in what was spent, who paid, and how to split it. Hit <strong>Add Expense</strong> and the balances update instantly.</p>
          </Step>
          <Step n={4} title="Settle up when you're ready">
            <p>Click <strong>Settle Up</strong> to record a payment to another member. The balances adjust automatically — no need to delete or edit anything.</p>
          </Step>
        </div>
        <Tip>You don&apos;t need to settle every expense individually. Log everything as you go, then settle the net amount at the end of the trip.</Tip>
      </Section>

      {/* ── GROUPS ─────────────────────────────────────────────────────── */}
      <Section id="groups" emoji="👥" title="Groups & Members">
        <p className="text-sm text-gray-600 leading-relaxed">
          Groups are the core unit. Each group has its own expenses, balances, activity log, and members. You can be in multiple groups.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard emoji="✏️" title="Create a group" description="Give it a name, emoji avatar, and optional description. You become the Admin automatically." />
          <FeatureCard emoji="📧" title="Add by email" description="Invite anyone who has signed in at least once by typing their email in + Member." />
          <FeatureCard emoji="🔗" title="Invite link" description="Share a link or QR code. Recipients sign in and join automatically. Links can be revoked." />
          <FeatureCard emoji="🛡️" title="Roles" description="Admins can manage the group. Members can add/edit expenses and record settlements." />
        </div>
        <Note>
          Removing a member is not yet supported — add only people you actually want in the group. If someone joined by mistake, contact the admin.
        </Note>
        <Tip>
          Use the <strong>emoji</strong> to tell groups apart at a glance on your dashboard — 🏖️ for holidays, 🏠 for flatmates, 🍕 for a dinner group, etc.
        </Tip>
      </Section>

      {/* ── EXPENSES ───────────────────────────────────────────────────── */}
      <Section id="expenses" emoji="💳" title="Adding Expenses">
        <p className="text-sm text-gray-600 leading-relaxed">
          Every payment you want to track goes in as an expense. The person who physically paid gets set as &quot;Paid by&quot;, and then you choose how to divide the cost.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
          <div className="px-4 py-3 flex gap-3">
            <span className="font-medium text-gray-700 w-24 flex-shrink-0">Description</span>
            <span className="text-gray-500">What the expense was for — e.g. &quot;Dinner at Blue Elephant&quot;</span>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="font-medium text-gray-700 w-24 flex-shrink-0">Amount</span>
            <span className="text-gray-500">The total cost. Choose any currency — each expense tracks its own.</span>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="font-medium text-gray-700 w-24 flex-shrink-0">Paid by</span>
            <span className="text-gray-500">Who actually handed over the money or card. Can be anyone in the group, including guests.</span>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="font-medium text-gray-700 w-24 flex-shrink-0">Split</span>
            <span className="text-gray-500">How the cost is shared. See <a href="#split-types" className="text-emerald-600 underline">Split Types</a> below.</span>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="font-medium text-gray-700 w-24 flex-shrink-0">Split between</span>
            <span className="text-gray-500">Which members share this expense. Uncheck anyone who wasn&apos;t involved.</span>
          </div>
        </div>
        <Tip>
          You can <strong>edit</strong> any expense later by clicking the pencil icon, or <strong>delete</strong> it with the trash icon. All balance calculations update instantly.
        </Tip>
        <Note>
          Expenses are soft-deleted — they&apos;re hidden from the list but kept for auditing purposes. The activity log always shows the full history.
        </Note>
      </Section>

      {/* ── SPLIT TYPES ────────────────────────────────────────────────── */}
      <Section id="split-types" emoji="➗" title="Split Types">
        <p className="text-sm text-gray-600 leading-relaxed">
          Choose how to divide an expense. The right type depends on the situation:
        </p>
        <SplitExample
          type="Equal"
          label="Split evenly"
          example="₹3,000 dinner ÷ 3 people = ₹1,000 each"
          detail="Everyone pays the same share. Uncheck members who weren't there."
        />
        <SplitExample
          type="Percentage"
          label="Split by %"
          example="You pay 50%, Alice 30%, Bob 20% of a ₹5,000 hotel"
          detail="Enter a percentage for each person. Must add up to 100% (the app will warn you if it doesn't)."
        />
        <SplitExample
          type="Exact"
          label="Split by exact amount"
          example="You had the ₹800 steak, Alice had the ₹400 salad"
          detail="Enter the precise rupee (or any currency) amount each person owes. Useful when the menu prices are clearly different."
        />
        <SplitExample
          type="Shares"
          label="Split by shares (ratio)"
          example="2 adults (2 shares each) + 1 child (1 share) of ₹1,500 = ₹600 / ₹600 / ₹300"
          detail="Enter a share count per person. The total is divided proportionally. Great for trips with mixed group compositions."
        />
        <Tip>
          <strong>Shares</strong> is the most flexible type. Instead of calculating percentages yourself, just think in ratios — double share, half share, etc.
        </Tip>
        <Warning>
          For <strong>Percentage</strong> splits, make sure all the percentages add up to exactly 100%. The app validates this before saving.
        </Warning>
      </Section>

      {/* ── GUESTS ─────────────────────────────────────────────────────── */}
      <Section id="guests" emoji="🦊" title="Guest Members">
        <p className="text-sm text-gray-600 leading-relaxed">
          Guest members are people who don&apos;t have (or don&apos;t want) an account — a parent, a cash-only friend, a one-time traveller. They participate in all expenses and balances but can&apos;t sign in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard emoji="➕" title="Adding a guest" description="In + Member, scroll to 'Add a guest'. Give them a name and pick an emoji avatar from the 18 options." />
          <FeatureCard emoji="🎭" title="Emoji avatars" description="Each guest gets a unique emoji avatar (🦊, 🐻, 🐼…) so they're instantly recognisable in expense lists and balance rows." />
          <FeatureCard emoji="⚖️" title="Full balance tracking" description="Guests appear in all balance calculations just like real members. You can see exactly who owes them and what they owe." />
          <FeatureCard emoji="💵" title="Guest Settle" description="Record cash or offline payments involving a guest. The amber 'Guest Settle' button appears automatically once a guest exists." />
        </div>
        <Tip>
          Guests are tied to the group they were added to. If they later create an account, ask them to join via the invite link — their guest balance history stays separate.
        </Tip>
        <Note>
          The <strong>Guest Settle</strong> button only appears when your group has at least one guest — it won&apos;t clutter the UI otherwise.
        </Note>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-800">How Guest Settle works</p>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>Click <strong>Guest Settle</strong></li>
            <li>Pick who paid (From) and who received (To) — at least one must be a guest</li>
            <li>The app suggests the current outstanding balance between those two</li>
            <li>Enter the amount, currency, and a short note (e.g. &quot;cash on day 3&quot;, &quot;UPI ref 1234&quot;)</li>
            <li>Hit <strong>Record payment</strong> — the balance updates for everyone immediately</li>
          </ol>
        </div>
      </Section>

      {/* ── BALANCES ───────────────────────────────────────────────────── */}
      <Section id="balances" emoji="⚖️" title="Balances">
        <p className="text-sm text-gray-600 leading-relaxed">
          The group page shows two balance views. Both update live whenever anyone adds or settles an expense.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          <div className="px-4 py-4 space-y-1">
            <p className="text-sm font-semibold text-gray-900">Simplified &quot;Who owes whom&quot;</p>
            <p className="text-sm text-gray-600">Shows the <em>minimum</em> number of payments needed to fully settle the group. If 6 people owe each other in a complex web, this might reduce it to just 1 payment. The badge shows the reduction (e.g. &quot;6→1 simplified&quot;).</p>
          </div>
          <div className="px-4 py-4 space-y-1">
            <p className="text-sm font-semibold text-gray-900">All balances page</p>
            <p className="text-sm text-gray-600">Click <strong>All balances</strong> to see every pair of people and exactly how much each owes the other — before any simplification. Includes guests. Toggle &quot;Net per pair&quot; to see gross amounts when money has flowed both ways.</p>
          </div>
          <div className="px-4 py-4 space-y-1">
            <p className="text-sm font-semibold text-gray-900">Currency conversion</p>
            <p className="text-sm text-gray-600">Use the <strong>Convert to</strong> dropdown in the &quot;Who owes whom&quot; card to see all balances in one currency. Rates are fetched live from <a href="https://www.frankfurter.app" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">frankfurter.app</a>. Supported currencies include USD, EUR, GBP, INR, JPY, and all other major currencies.</p>
          </div>
        </div>
        <Tip>
          The simplified view is great for planning who pays whom. The full pairwise view is useful for reviewing the actual history of who owes what to whom.
        </Tip>
        <Note>
          Balances are <strong>recalculated from raw expense data</strong> every time — there&apos;s no cached balance that can go stale. Add, edit, or delete an expense and the balances instantly reflect reality.
        </Note>
      </Section>

      {/* ── SETTLE ─────────────────────────────────────────────────────── */}
      <Section id="settle" emoji="💸" title="Settling Up">
        <p className="text-sm text-gray-600 leading-relaxed">
          Settling up records that a payment was made. It doesn&apos;t delete expenses — it adds a settlement entry that reduces the outstanding balance.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700 border border-emerald-300 rounded px-1.5 py-0.5 text-xs">Settle Up</span>
              Real members
            </p>
            <p className="text-sm text-gray-600">Use this when you (the logged-in user) want to record that you paid someone back. Pick who you paid, the currency and amount. The &quot;Who owes whom&quot; card suggests the exact amount to pay.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <span className="text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 text-xs">Guest Settle</span>
              With guests
            </p>
            <p className="text-sm text-gray-600">Use this when a payment involves a guest member. Any group member can record settlements on behalf of guests — the From or To must be a guest.</p>
          </div>
        </div>
        <Tip>
          You don&apos;t have to settle the exact suggested amount. Record partial payments as they happen and the remaining balance stays accurate.
        </Tip>
        <Warning>
          Settlements cannot be deleted yet. If you record the wrong amount, add a corrective settlement in the opposite direction for the difference.
        </Warning>
      </Section>

      {/* ── REALTIME ───────────────────────────────────────────────────── */}
      <Section id="realtime" emoji="⚡" title="Live Updates">
        <p className="text-sm text-gray-600 leading-relaxed">
          Every open tab of a group page is connected to a live update stream. When anyone in the group adds an expense, records a settlement, or adds a member, every other open tab updates automatically — no manual refresh needed.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">👤</span>
            <p className="text-gray-600">User A records a settlement on their phone.</p>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">📡</span>
            <p className="text-gray-600">Server broadcasts a change event to all connected tabs.</p>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">🖥️</span>
            <p className="text-gray-600">User B&apos;s browser refreshes the balances and expense list silently.</p>
          </div>
        </div>
        <Note>
          If you have the group open in a background tab, it pauses live updates to save bandwidth. As soon as you switch back to it, it catches up with any changes made while you were away.
        </Note>
      </Section>

      {/* ── INVITE ─────────────────────────────────────────────────────── */}
      <Section id="invite" emoji="🔗" title="Invite Links & QR Codes">
        <p className="text-sm text-gray-600 leading-relaxed">
          Every group has a shareable invite link and matching QR code so people can join without you having to know their email.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          <div className="px-4 py-3 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <p className="text-sm text-gray-600">Open <strong>+ Member</strong> in your group — the QR code and link are generated automatically.</p>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <p className="text-sm text-gray-600">Share the link via WhatsApp/iMessage, or have people scan the QR at the table.</p>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <p className="text-sm text-gray-600">They sign in with Google, land on the invite page, and join with one tap.</p>
          </div>
        </div>
        <Tip>
          The same link works for everyone — you only need to share it once. If you want to stop new people joining, generate a new token (the old link becomes invalid). Each group has one active invite token at a time.
        </Tip>
      </Section>

      {/* ── CHARTS ─────────────────────────────────────────────────────── */}
      <Section id="charts" emoji="📊" title="Charts & Analytics">
        <p className="text-sm text-gray-600 leading-relaxed">
          Scroll down on any group page to see visual breakdowns of spending. Use the <strong>Currency</strong> dropdown to view charts in a specific currency.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard emoji="📈" title="Cumulative spending" description="A running total of money spent over time. Great for seeing how quickly costs add up across a trip." />
          <FeatureCard emoji="📊" title="Daily spending" description="Bar chart of how much was spent each day. Identify the big-spend days at a glance." />
          <FeatureCard emoji="🙋" title="Paid vs. consumed" description="For each member — how much they paid out of pocket vs. how much of the total they consumed." />
          <FeatureCard emoji="⚖️" title="Net balance" description="Each member's net position: positive means they're owed money, negative means they owe." />
          <FeatureCard emoji="🥧" title="Split-type breakdown" description="Pie chart showing how many expenses used equal, percentage, exact, or shares splits." />
          <FeatureCard emoji="💸" title="Settlements" description="Bar chart of all recorded settlements over time — useful for tracking payment history." />
        </div>
        <Tip>
          The dashboard also has cross-group charts showing your overall spending across all groups — handy for a monthly spending overview.
        </Tip>
      </Section>

      {/* ── EXPORT ─────────────────────────────────────────────────────── */}
      <Section id="export" emoji="📥" title="Export">
        <p className="text-sm text-gray-600 leading-relaxed">
          Click <strong>Export</strong> on any group page to download a full balance sheet as an Excel (.xlsx) file.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">📋</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Members sheet</p>
              <p className="text-xs text-gray-500 mt-0.5">All group members with their roles and join dates.</p>
            </div>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">🧾</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Expenses sheet</p>
              <p className="text-xs text-gray-500 mt-0.5">Every expense with description, amount, currency, who paid, split type, and per-member split amounts.</p>
            </div>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">💳</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Settlements sheet</p>
              <p className="text-xs text-gray-500 mt-0.5">All recorded payments between members.</p>
            </div>
          </div>
          <div className="px-4 py-3 flex gap-3">
            <span className="text-lg flex-shrink-0">⚖️</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Balance summary sheet</p>
              <p className="text-xs text-gray-500 mt-0.5">The simplified &quot;who pays whom&quot; list — ready to screenshot and share.</p>
            </div>
          </div>
        </div>
        <Tip>
          Export right before settling up so you have a record of what was owed. Great for reimbursement receipts or company expense reports.
        </Tip>
      </Section>

      {/* ── TIPS ───────────────────────────────────────────────────────── */}
      <Section id="tips" emoji="🏆" title="Tips & Tricks">
        <div className="space-y-3">
          <Tip>
            <strong>Log expenses as they happen</strong> — don&apos;t wait until the end of the trip to add everything. It&apos;s much easier to remember who paid what in the moment.
          </Tip>
          <Tip>
            <strong>Multi-currency is fully supported</strong> — each expense tracks its own currency. When you have mixed-currency groups (INR + USD, for example), use &quot;Convert to&quot; in the balances panel to see everything in one currency.
          </Tip>
          <Tip>
            <strong>Don&apos;t settle as you go</strong> unless you want to. Record all expenses first, then settle the net amount at the end. This keeps payment count to a minimum.
          </Tip>
          <Tip>
            <strong>Use Shares for unequal groups</strong> — e.g. 2 adults + 1 child share an Airbnb: adults get 2 shares each, child gets 1. No need to calculate exact percentages.
          </Tip>
          <Tip>
            <strong>Guests see their balances publicly</strong> — everyone in the group can see what a guest owes or is owed. Perfect for group accountability without requiring the guest to create an account.
          </Tip>
          <Tip>
            <strong>Activity log is your audit trail</strong> — every addition, edit, deletion, and settlement is recorded with who did it and when. Check it on the right panel of any group page.
          </Tip>
          <Tip>
            <strong>Open the group on multiple devices</strong> — the live update system (SSE) means your phone and laptop both stay in sync automatically.
          </Tip>
        </div>
      </Section>

      {/* Footer CTA */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-5 text-center space-y-3">
        <p className="text-base font-semibold text-emerald-900">Ready to get started?</p>
        <p className="text-sm text-emerald-700">Create your first group and split your next expense in seconds.</p>
        <Link
          href="/groups/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
        >
          Create a group <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
