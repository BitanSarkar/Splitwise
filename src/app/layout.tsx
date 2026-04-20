import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { NavigationProgress } from "@/components/navigation-progress";

const geist = Geist({ subsets: ["latin"] });

const BASE_URL = "https://splitwise.bitsar.net";

const DESCRIPTION =
  "Splitwise is a free bill-splitting app to track shared expenses with friends, family, and teammates. Split bills equally, by percentage, exact amount, or custom shares. Supports multi-currency, group expense tracking, settle-up, guest members, live balance updates, and Excel export. The easiest way to manage group money.";

const KEYWORDS = [
  "splitwise",
  "split bills",
  "split expenses",
  "bill splitting app",
  "expense splitter",
  "group expense tracker",
  "share expenses with friends",
  "settle up app",
  "who owes who",
  "IOUs tracker",
  "shared expenses",
  "split money",
  "bill splitter",
  "expense sharing",
  "trip expense tracker",
  "roommate expense tracker",
  "split dinner bill",
  "group payment tracker",
  "money split calculator",
  "fair expense split",
  "multi-currency expense tracker",
  "free splitwise alternative",
  "splitwise clone",
  "expense management app",
  "track shared expenses online",
].join(", ");

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Splitwise – Free Bill Splitting App | Split Expenses with Friends",
    template: "%s | Splitwise",
  },
  description: DESCRIPTION,
  keywords: KEYWORDS,
  authors: [{ name: "Bitan Sarkar", url: "mailto:bitansarkar12345@gmail.com" }],
  creator: "Bitan Sarkar",
  publisher: "Bitan Sarkar",
  applicationName: "Splitwise",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  category: "finance",

  // ── Canonical ──────────────────────────────────────────────────────────────
  alternates: {
    canonical: BASE_URL,
    languages: { "en-US": BASE_URL },
  },

  // ── Open Graph ─────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Splitwise",
    title: "Splitwise – Free Bill Splitting App | Split Expenses with Friends",
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Splitwise – Split expenses with friends",
        type: "image/png",
      },
    ],
  },

  // ── Twitter / X ────────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    site: "@splitwiseapp",
    creator: "@bitansarkar",
    title: "Splitwise – Free Bill Splitting App",
    description: "Split expenses with friends, family & teammates. Free, fast, and fair.",
    images: [`${BASE_URL}/opengraph-image`],
  },

  // ── PWA / Apple ────────────────────────────────────────────────────────────
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Splitwise",
    startupImage: [{ url: `${BASE_URL}/icons/512` }],
  },
  formatDetection: { telephone: false },

  // ── Robots ─────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification ───────────────────────────────────────────────────────────
  // Add your Google Search Console verification token here once you've claimed the site:
  // verification: { google: "YOUR_GOOGLE_VERIFICATION_TOKEN" },
};

// ── JSON-LD Structured Data ─────────────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Splitwise",
      description: "Free bill splitting app to track shared expenses with friends and family.",
      publisher: { "@id": `${BASE_URL}/#author` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/signin` },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#app`,
      name: "Splitwise",
      alternateName: [
        "Split bills app",
        "Bill splitter",
        "Expense splitter",
        "Group expense tracker",
        "Shared expenses app",
      ],
      url: BASE_URL,
      description: DESCRIPTION,
      applicationCategory: "FinanceApplication",
      applicationSubCategory: "Personal Finance",
      operatingSystem: "Web, Android, iOS",
      browserRequirements: "Requires JavaScript. Requires a modern web browser.",
      softwareVersion: "1.0.0",
      releaseNotes: "Multi-currency, 4 split modes, guest members, live updates, Excel export.",
      featureList: [
        "Equal bill splitting",
        "Split by percentage",
        "Split by exact amount",
        "Split by custom shares",
        "Multi-currency support",
        "Group expense tracking",
        "Settle up tracking",
        "Guest member support",
        "Live balance updates",
        "QR code group invites",
        "Excel export",
        "Spending charts and analytics",
        "Simplified debt calculation",
        "Mobile-first PWA",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        description: "Free to use — no subscription, no hidden fees.",
      },
      author: { "@id": `${BASE_URL}/#author` },
      creator: { "@id": `${BASE_URL}/#author` },
      datePublished: "2024-01-01",
      dateModified: new Date().toISOString().split("T")[0],
      image: `${BASE_URL}/opengraph-image`,
      screenshot: `${BASE_URL}/opengraph-image`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        ratingCount: "1",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "Person",
      "@id": `${BASE_URL}/#author`,
      name: "Bitan Sarkar",
      email: "bitansarkar12345@gmail.com",
      url: `${BASE_URL}`,
      sameAs: ["https://github.com/BitanSarkar"],
      knowsAbout: ["Web Development", "Full-Stack Development", "Next.js", "React", "TypeScript"],
      jobTitle: "Software Developer",
    },
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Splitwise free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Splitwise is completely free to use with no subscription or hidden fees.",
          },
        },
        {
          "@type": "Question",
          name: "How do I split a bill equally?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Create a group, add your friends, then add an expense and select 'Equal' split type. Splitwise will automatically divide the amount equally among all selected members.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use Splitwise without an account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You need a Google account to sign in, but you can add 'guest members' to your groups for friends who don't have accounts. They'll participate in all expense tracking and balance calculations.",
          },
        },
        {
          "@type": "Question",
          name: "Does Splitwise support multiple currencies?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Each expense can be in any currency. Use the 'Convert to' feature in the balances view to see all balances converted to a single currency using live exchange rates.",
          },
        },
        {
          "@type": "Question",
          name: "What split types does Splitwise support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Splitwise supports 4 split types: Equal (everyone pays the same), Percentage (e.g. 50/30/20%), Exact amount (specific dollar amounts per person), and Shares (ratio-based, e.g. 2:2:1 for adults and a child).",
          },
        },
        {
          "@type": "Question",
          name: "Is this the official Splitwise app?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "This is an independent bill-splitting web app created by Bitan Sarkar (bitansarkar12345@gmail.com), inspired by the idea of splitting expenses easily. It is not affiliated with Splitwise Inc.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Preconnect to key origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://api.frankfurter.app" />
        {/* Author link */}
        <link rel="author" href="mailto:bitansarkar12345@gmail.com" />
        <link rel="me" href="mailto:bitansarkar12345@gmail.com" />
      </head>
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <NavigationProgress />
        {children}
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
