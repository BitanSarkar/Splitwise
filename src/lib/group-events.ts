// Tiny in-process pub/sub for group-scoped realtime updates.
//
// Server actions emit "something changed in group X" events; the SSE route
// handler at `/api/groups/[groupId]/events` subscribes and pushes a message
// to every connected tab, which in turn calls `router.refresh()` to refetch
// the RSC payload.
//
// This is intentionally in-memory — the pm2 config runs a single Next.js
// instance (`instances: 1`), so all subscribers and publishers share one
// process. If we ever go multi-process, swap this out for Redis pub/sub or
// similar; the API below is the only surface that would need to change.

import { EventEmitter } from "node:events";

// One emitter for the whole process. Channel name = groupId. Raising the
// default max listeners because a group with lots of open tabs would hit
// the default 10 quickly.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type GroupEventKind =
  | "expense"
  | "settlement"
  | "member"
  | "guest";

export interface GroupEvent {
  kind: GroupEventKind;
  at: number; // ms since epoch, useful for client-side dedupe/debug
}

export function emitGroupEvent(groupId: string, kind: GroupEventKind) {
  const event: GroupEvent = { kind, at: Date.now() };
  emitter.emit(groupId, event);
}

export function subscribeGroupEvents(
  groupId: string,
  handler: (event: GroupEvent) => void
): () => void {
  emitter.on(groupId, handler);
  return () => {
    emitter.off(groupId, handler);
  };
}
