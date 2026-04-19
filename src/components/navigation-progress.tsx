"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatingRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pathname changes, complete the bar
  useEffect(() => {
    if (!navigatingRef.current) return;
    navigatingRef.current = false;
    if (tickerRef.current) clearInterval(tickerRef.current);
    setWidth(100);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
  }, [pathname]);

  useEffect(() => {
    function start() {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setVisible(true);
      setWidth(8);
      let w = 8;
      tickerRef.current = setInterval(() => {
        // Exponential ease-out — approaches 85% but never reaches it
        w = w + (85 - w) * 0.065;
        setWidth(Math.min(w, 85));
      }, 120);
    }

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.getAttribute("target") === "_blank" ||
        e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
      ) return;
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath && targetPath !== window.location.pathname) {
        start();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 z-[500] pointer-events-none"
      style={{
        height: 2,
        width: `${width}%`,
        background: "linear-gradient(to right, #059669, #34d399)",
        transition:
          width === 100
            ? "width 150ms ease-out, opacity 250ms ease-out 150ms"
            : "width 300ms ease-out",
        opacity: width >= 100 ? 0 : 1,
        boxShadow: "0 0 8px #34d399aa",
      }}
    />
  );
}
