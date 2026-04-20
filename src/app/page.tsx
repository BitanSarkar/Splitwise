import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Splitwise – Free Bill Splitting App | Split Expenses with Friends & Family",
  description:
    "Splitwise is a free bill splitting app to track and split expenses with friends, family, and teammates. Split bills equally, by percentage, exact amount, or custom shares. Multi-currency, group expense tracker, settle up, guest members — all free.",
  alternates: { canonical: "https://splitwise.bitsar.net" },
  openGraph: {
    url: "https://splitwise.bitsar.net",
    title: "Splitwise – Free Bill Splitting App | Split Expenses with Friends",
    description:
      "The easiest way to split bills, track shared expenses, and settle up with friends. Free bill splitter with multi-currency support, 4 split modes, and real-time balance updates.",
  },
};

const FEATURES = [
  {
    emoji: "⚖️",
    title: "4 Ways to Split",
    desc: "Equal, percentage, exact amount, or custom shares — every real-world situation covered.",
  },
  {
    emoji: "💱",
    title: "Multi-Currency",
    desc: "Each expense in its own currency. Convert balances to any currency with live exchange rates.",
  },
  {
    emoji: "🦊",
    title: "Guest Members",
    desc: "Add cash-only friends with no account. Full balance tracking — no sign-up required for them.",
  },
  {
    emoji: "⚡",
    title: "Live Updates",
    desc: "Every tab syncs instantly. Add an expense and your friends see it in real time.",
  },
  {
    emoji: "🔗",
    title: "QR Invite Links",
    desc: "One link or QR code — anyone can join your group with one tap. No email needed.",
  },
  {
    emoji: "📊",
    title: "Charts & Analytics",
    desc: "See cumulative spend, daily breakdowns, paid vs. consumed, and net balances visually.",
  },
  {
    emoji: "📥",
    title: "Excel Export",
    desc: "Download a full balance sheet — expenses, settlements, and the final who-pays-whom list.",
  },
  {
    emoji: "🔢",
    title: "Simplified Debts",
    desc: "Minimise payments. 6 IOUs can become 1 — we calculate the optimal settlement path.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create a group",
    desc: "Trip, household, dinner — any shared spending occasion. Name it, pick an emoji, you're in.",
  },
  {
    step: "2",
    title: "Add members",
    desc: "Invite friends by email, share a QR code link, or add them as guests if they don't have accounts.",
  },
  {
    step: "3",
    title: "Log expenses",
    desc: "Who paid, how much, split it how you want. Four modes: equal, percentage, exact, or shares.",
  },
  {
    step: "4",
    title: "Settle up",
    desc: "See the minimum payments to zero everyone out. Record settlements and balances clear instantly.",
  },
];

const USE_CASES = [
  { emoji: "✈️", label: "Travel & trips" },
  { emoji: "🏠", label: "Flatmates & rent" },
  { emoji: "🍕", label: "Shared dinners" },
  { emoji: "🎉", label: "Events & parties" },
  { emoji: "🏢", label: "Team expenses" },
  { emoji: "💑", label: "Couples & family" },
];

export default async function HomePage() {
  // Redirect signed-in users straight to their dashboard
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── NAV ───────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-xl">💸</span>
            <span>Splitwise</span>
          </div>
          <Link
            href="/signin"
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
          >
            Get Started — Free
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white py-20 sm:py-28 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="text-6xl sm:text-7xl">💸</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Split expenses with friends,{" "}
              <span className="text-emerald-200">simply.</span>
            </h1>
            <p className="text-lg sm:text-xl text-emerald-100 max-w-2xl mx-auto leading-relaxed">
              The free bill-splitting app for trips, flatmates, dinners, and everything in between.
              Track shared expenses, settle up in any currency, and never argue about money again.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/signin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-700 font-semibold rounded-lg text-base hover:bg-emerald-50 transition-colors shadow-md"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google — It&apos;s Free
              </Link>
            </div>
            <p className="text-emerald-200 text-sm">No credit card. No subscription. Always free.</p>
          </div>
        </section>

        {/* ── USE CASES ─────────────────────────────────────────────────── */}
        <section className="py-10 px-4 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
              Perfect for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {USE_CASES.map(({ emoji, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm font-medium text-emerald-800"
                >
                  {emoji} {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map(({ step, title, desc }) => (
                <div key={step} className="text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center mx-auto">
                    {step}
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────── */}
        <section className="py-16 px-4 bg-white border-y border-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
              Everything you need to split bills fairly
            </h2>
            <p className="text-center text-gray-500 text-sm mb-10">
              A complete expense-splitting toolkit — free, no account required for guests.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map(({ emoji, title, desc }) => (
                <div
                  key={title}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2"
                >
                  <span className="text-2xl">{emoji}</span>
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SPLIT TYPES EXPLAINER ─────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
              Split any way you want
            </h2>
            <p className="text-center text-gray-500 text-sm mb-10">
              Four split modes so every real-world situation is covered.
            </p>
            <div className="space-y-3">
              {[
                {
                  type: "Equal",
                  color: "emerald",
                  example: "₹3,000 dinner ÷ 3 people = ₹1,000 each",
                  detail: "Everyone pays the same share. Uncheck members who weren't there.",
                },
                {
                  type: "Percentage",
                  color: "blue",
                  example: "You 50%, Alice 30%, Bob 20% of a $200 hotel",
                  detail: "Enter a percentage for each person. Must total 100%.",
                },
                {
                  type: "Exact",
                  color: "violet",
                  example: "You had the $24 steak, Alice had the $12 salad",
                  detail: "Specify the precise dollar amount each person owes.",
                },
                {
                  type: "Shares",
                  color: "amber",
                  example: "2 adults (2 shares) + 1 child (1 share) of $150 = $60 / $60 / $30",
                  detail: "Enter a ratio — perfect for mixed groups without calculating percentages.",
                },
              ].map(({ type, color, example, detail }) => (
                <div
                  key={type}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4"
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wide bg-${color}-100 text-${color}-700 px-2 py-1 rounded h-fit flex-shrink-0 mt-0.5`}
                  >
                    {type}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{example}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="py-16 px-4 bg-white border-y border-gray-100">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Is Splitwise free?",
                  a: "Yes — completely free. No subscription, no hidden fees, no premium tier.",
                },
                {
                  q: "Do my friends need an account to be included?",
                  a: "No. Add them as 'guest members' with just a name. They'll be included in all expense calculations and balances without needing to sign up.",
                },
                {
                  q: "What currencies are supported?",
                  a: "All major currencies — USD, EUR, GBP, INR, JPY, AUD, CAD, and many more. Each expense tracks its own currency, and you can convert balances with live exchange rates.",
                },
                {
                  q: "How is this different from the original Splitwise?",
                  a: "This is an independent open-source alternative built by Bitan Sarkar. It's fully free with no premium limits, supports guest members without accounts, and has a clean mobile-first design that works as a PWA.",
                },
                {
                  q: "Can I use this on my phone?",
                  a: "Yes — install it as a PWA (Progressive Web App) from your browser for a native app experience on Android and iOS. No app store needed.",
                },
                {
                  q: "What happens when the trip is over?",
                  a: "Use the Settle Up feature to record final payments. Export a full balance sheet to Excel for your records. The group stays saved so you can always look back.",
                },
              ].map(({ q, a }) => (
                <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 text-sm list-none select-none hover:bg-gray-50">
                    {q}
                    <span className="ml-3 text-gray-400 group-open:rotate-180 transition-transform text-xs">▼</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-center">
          <div className="max-w-xl mx-auto space-y-5">
            <div className="text-5xl">💸</div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Ready to split smarter?
            </h2>
            <p className="text-emerald-100 text-base">
              Join and start tracking shared expenses in under a minute — completely free.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-emerald-700 font-semibold rounded-lg text-base hover:bg-emerald-50 transition-colors shadow-md"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-semibold">
                <span>💸</span> Splitwise
              </div>
              <p className="text-xs text-gray-500">
                Free bill-splitting app. Split expenses, settle up, stay friends.
              </p>
            </div>
            <div className="space-y-1 text-xs">
              <p>
                Built by{" "}
                <a
                  href="mailto:bitansarkar12345@gmail.com"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Bitan Sarkar
                </a>
              </p>
              <p className="text-gray-600">bitansarkar12345@gmail.com</p>
              <p className="text-gray-600">
                <a
                  href="https://github.com/BitanSarkar/Splitwise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors"
                >
                  github.com/BitanSarkar/Splitwise
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Splitwise — Not affiliated with Splitwise Inc.</p>
            <div className="flex gap-4">
              <Link href="/signin" className="hover:text-gray-400 transition-colors">Sign In</Link>
              <Link href="/help" className="hover:text-gray-400 transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
