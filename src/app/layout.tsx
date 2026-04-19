import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { NavigationProgress } from "@/components/navigation-progress";
import { SplashRemover } from "@/components/splash-remover";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Splitwise - Split bills with friends",
  description: "The easy way to split expenses with friends and family.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Splitwise",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Splitwise – Split bills with friends",
    description: "The easy way to split expenses with friends and family.",
    url: "https://splitwise.bitsar.net",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Splash styles — inlined so they apply before any CSS bundle loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          #app-splash {
            position: fixed; inset: 0; z-index: 9999;
            background: #f9fafb;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 20px;
          }
          #app-splash .splash-icon { font-size: 56px; line-height: 1; }
          #app-splash .splash-label {
            font-size: 20px; font-weight: 600; color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            letter-spacing: -0.01em;
          }
          #app-splash .splash-ring {
            width: 32px; height: 32px;
            border: 3px solid #d1fae5;
            border-top-color: #059669;
            border-radius: 50%;
            animation: splash-spin 0.75s linear infinite;
          }
          @keyframes splash-spin { to { transform: rotate(360deg); } }
        `}} />
      </head>
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        {/* Splash: visible before React hydrates; SplashRemover hides it on mount */}
        <div id="app-splash" aria-hidden>
          <div className="splash-icon">💸</div>
          <div className="splash-label">Splitwise</div>
          <div className="splash-ring" />
        </div>

        <NavigationProgress />
        {children}
        {/* SplashRemover runs on client mount — hides splash exactly when React is ready */}
        <SplashRemover />
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
