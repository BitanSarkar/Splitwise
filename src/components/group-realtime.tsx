"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Opens an EventSource to the group's SSE stream and calls `router.refresh()`
// whenever a mutation event arrives. That re-runs the page's server
// components and re-renders with the updated balances / expenses / activity.
//
// EventSource auto-reconnects on its own with a backoff, so if the app
// restarts or the network blips we pick back up without any extra logic.
// Events missed during a disconnect are effectively replayed by the
// `router.refresh()` that fires on the next event after reconnect — and on
// mount we already have the latest state from the SSR pass.
//
// We pause when the tab is hidden and catch up (one refresh) on re-show so
// background tabs don't thrash React/the server.
export function GroupRealtime({ groupId }: { groupId: string }) {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let missedWhileHidden = false;

    function open() {
      es?.close();
      es = new EventSource(`/api/groups/${groupId}/events`);
      es.addEventListener("change", () => {
        if (document.visibilityState === "hidden") {
          missedWhileHidden = true;
          return;
        }
        router.refresh();
      });
      // EventSource handles reconnects; no extra onerror needed.
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && missedWhileHidden) {
        missedWhileHidden = false;
        router.refresh();
      }
    }

    open();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      es?.close();
    };
  }, [groupId, router]);

  return null;
}
