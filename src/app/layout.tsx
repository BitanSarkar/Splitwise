import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { NavigationProgress } from "@/components/navigation-progress";

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
  formatDetection: {
    telephone: false,
  },
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
        {/* Inline splash: shown before React hydrates, hidden once JS runs */}
        <style dangerouslySetInnerHTML={{ __html: `
          #app-splash {
            position: fixed; inset: 0; z-index: 9999;
            background: #f9fafb;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 16px;
          }
          #app-splash .splash-icon { font-size: 52px; }
          #app-splash .splash-ring {
            width: 36px; height: 36px;
            border: 3px solid #d1fae5;
            border-top-color: #059669;
            border-radius: 50%;
            animation: splash-spin 0.8s linear infinite;
          }
          @keyframes splash-spin { to { transform: rotate(360deg); } }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var el = document.getElementById('app-splash');
            if (!el) return;
            function hide() {
              el.style.transition = 'opacity 0.3s ease';
              el.style.opacity = '0';
              setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
            }
            // Max display time: 600ms — enough to feel intentional, short enough
            // not to block the loading skeleton from showing.
            setTimeout(hide, 600);
          })();
        `}} />
      </head>
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        {/* Splash shown before hydration */}
        <div id="app-splash" aria-hidden>
          <div className="splash-icon">💸</div>
          <div className="splash-ring" />
        </div>
        <NavigationProgress />
        {children}
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
