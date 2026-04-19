"use client";

import { useEffect } from "react";

/**
 * Removes the inline #app-splash element the moment React hydrates.
 * This is more reliable than a fixed setTimeout because it fires
 * precisely when the client is ready to show content, regardless
 * of how long the server took to respond.
 */
export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;
    // rAF: let the browser paint the real content first
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.25s ease";
      el.style.opacity = "0";
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 280);
    });
  }, []);

  return null;
}
