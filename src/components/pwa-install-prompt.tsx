"use client";

import { useEffect, useState } from "react";
import { X, Share, Download } from "lucide-react";

type Platform = "android" | "ios" | "desktop" | null;

const DISMISSED_KEY = "pwa-install-dismissed";
const DISMISSED_FOREVER_KEY = "pwa-install-dismissed-forever";

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  if (isIos) return "ios";
  if (isAndroid) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error Safari iOS property
    window.navigator.standalone === true
  );
}

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already installed or user dismissed forever
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_FOREVER_KEY)) return;

    // Throttle: only show once per day if soft-dismissed
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const age = Date.now() - parseInt(dismissedAt, 10);
      if (age < 24 * 60 * 60 * 1000) return; // 24 h
    }

    const p = getPlatform();
    setPlatform(p);

    // Chrome/Android/Desktop: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show immediately (no beforeinstallprompt available)
    if (p === "ios") {
      // Small delay so it doesn't flash immediately on page load
      const t = setTimeout(() => setShow(true), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss(forever = false) {
    setShow(false);
    if (forever) {
      localStorage.setItem(DISMISSED_FOREVER_KEY, "1");
    } else {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      dismiss(true); // installed — never show again
    } else {
      dismiss(false);
    }
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-slide-up">
      <div className="mx-auto max-w-md bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
            💸
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Install Splitwise</p>
            <p className="text-xs text-gray-500">Add to home screen for quick access</p>
          </div>
          <button
            onClick={() => dismiss(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-1">
          {platform === "ios" ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 leading-relaxed">
                To install on iPhone or iPad:
              </p>
              <ol className="space-y-1.5 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-medium text-xs mt-px">1</span>
                  <span>
                    Tap the{" "}
                    <span className="inline-flex items-center gap-0.5 font-medium">
                      <Share className="h-3 w-3" /> Share
                    </span>{" "}
                    button in Safari&apos;s toolbar
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-medium text-xs mt-px">2</span>
                  <span>Scroll down and tap <span className="font-medium">Add to Home Screen</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-medium text-xs mt-px">3</span>
                  <span>Tap <span className="font-medium">Add</span> — done! 🎉</span>
                </li>
              </ol>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => dismiss(false)}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => dismiss(true)}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Don&apos;t ask again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Install the app for a faster, native-like experience — works offline too.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Install app
                </button>
                <button
                  onClick={() => dismiss(false)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  onClick={() => dismiss(true)}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
