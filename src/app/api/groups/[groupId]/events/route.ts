import { auth } from "@/auth";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  subscribeGroupEvents,
  type GroupEvent,
} from "@/lib/group-events";

// SSE stream of mutation events for a single group. Clients open this and
// call `router.refresh()` whenever a message arrives, so any change made by
// any member is reflected in every open tab without manual reload.
//
// We don't buffer/replay events across reconnects — if a client misses one
// while disconnected, the `router.refresh()` it fires on reconnect catches
// it up. Good enough for this use case.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only members can subscribe — otherwise this would be a cheap way to
  // detect activity in any group you know the id of.
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, session.user.id)
    ),
  });
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // Controller already closed (client disconnected in between).
          closed = true;
        }
      };

      // Initial comment so the connection is immediately flushed and the
      // browser marks EventSource as "open".
      safeEnqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeGroupEvents(groupId, (event: GroupEvent) => {
        const payload = JSON.stringify(event);
        safeEnqueue(encoder.encode(`event: change\ndata: ${payload}\n\n`));
      });

      // 25s heartbeat. Many proxies/load balancers idle-kill long-lived
      // connections around 30–60s; a comment frame keeps the pipe warm
      // without firing a client-side event.
      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(": ping\n\n"));
      }, 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed — nothing to do.
        }
      };

      // The client went away (tab closed, navigated away, lost network).
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable nginx response buffering so events are flushed immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
