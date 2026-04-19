/**
 * Shared dialog layout helpers.
 *
 * Mobile  → bottom sheet (slides up from bottom, sits above keyboard)
 * Desktop → centred modal (sm breakpoint and up)
 */

/** Tailwind className for the Radix Dialog.Content element. */
export const dialogContentClass =
  // Mobile: full-width sheet anchored to bottom
  "fixed z-50 bg-white shadow-xl overflow-y-auto " +
  "inset-x-0 bottom-0 rounded-t-2xl max-h-[90dvh] " +
  // Desktop: centred modal
  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 " +
  "sm:-translate-x-1/2 sm:-translate-y-1/2 " +
  "sm:rounded-xl sm:w-[calc(100vw-2rem)] sm:max-w-md sm:max-h-[88vh]";

/** Same but wider — for dialogs that need more horizontal space (e.g. add-expense). */
export const dialogContentClassWide =
  "fixed z-50 bg-white shadow-xl overflow-y-auto " +
  "inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh] " +
  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 " +
  "sm:-translate-x-1/2 sm:-translate-y-1/2 " +
  "sm:rounded-xl sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:max-h-[88vh]";

/** Drag handle shown at the top of the sheet on mobile. */
export function DragHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
      <div className="w-10 h-1 rounded-full bg-gray-200" />
    </div>
  );
}
