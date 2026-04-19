"use client";

import { useState, useEffect } from "react";
import {
  addGuestToGroup,
  addMemberToGroup,
  getOrCreateGroupInviteToken,
} from "@/lib/actions";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import { Spinner } from "@/components/spinner";
import { dialogContentClass, DragHandle } from "@/components/dialog-primitives";

// Kept in sync with GUEST_EMOJIS in src/lib/actions.ts — server rejects any
// other emoji so the two lists must match.
const GUEST_EMOJIS = [
  "🦊", "🐻", "🐼", "🐸", "🐙", "🦁",
  "🐯", "🐨", "🐵", "🐶", "🐱", "🐰",
  "🦉", "🦄", "🐝", "🐢", "🐳", "🐧",
];

export function AddMemberDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Guest form state
  const [guestName, setGuestName] = useState("");
  const [guestEmoji, setGuestEmoji] = useState<string>(GUEST_EMOJIS[0]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestSuccess, setGuestSuccess] = useState("");

  const [inviteUrl, setInviteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || inviteUrl) return;
    let cancelled = false;
    setQrLoading(true);
    setQrError("");
    (async () => {
      try {
        const token = await getOrCreateGroupInviteToken(groupId);
        const url = `${window.location.origin}/join/${token}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 260,
          margin: 1,
          color: { dark: "#064e3b", light: "#ffffff" },
        });
        if (!cancelled) {
          setInviteUrl(url);
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        if (!cancelled) setQrError(err instanceof Error ? err.message : "Could not generate invite");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, groupId, inviteUrl]);

  function resetAll() {
    setEmail("");
    setError("");
    setSuccess("");
    setGuestName("");
    setGuestEmoji(GUEST_EMOJIS[0]);
    setGuestError("");
    setGuestSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      await addMemberToGroup(groupId, email.trim().toLowerCase());
      setSuccess(`Added ${email} to the group`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuestLoading(true);
    setGuestError("");
    setGuestSuccess("");
    try {
      await addGuestToGroup(groupId, guestName, guestEmoji);
      setOpen(false);
      resetAll();
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGuestLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setQrError("Could not copy");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <Dialog.Trigger asChild>
        <button className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap">
          + Member
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className={dialogContentClass}>
          <DragHandle />
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">Add Member</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* QR + invite link */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Invite by QR or link</p>
              <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg py-3">
                {qrLoading ? (
                  <div className="h-[200px] w-[200px] flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                    <Spinner className="h-5 w-5 text-emerald-500" />
                    <span>Generating…</span>
                  </div>
                ) : qrError ? (
                  <div className="h-[200px] w-[200px] flex items-center justify-center text-xs text-red-500 text-center px-3">{qrError}</div>
                ) : qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Group invite QR code" width={200} height={200} />
                ) : null}
              </div>
              {inviteUrl && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400">Anyone with this link can scan/open it to join. They&apos;ll be asked to sign in first.</p>
            </div>

            <div className="border-t border-gray-100" />

            {/* Email add */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or add by email</label>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">They must have signed in to Splitwise at least once.</p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading && <Spinner className="h-3.5 w-3.5" />}
                {loading ? "Adding…" : "Add by email"}
              </button>
            </form>

            <div className="border-t border-gray-100" />

            {/* Guest add — no account needed */}
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Or add a guest</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  For someone without an account. Everyone in the group can see
                  their balances and record settlements on their behalf.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dad, Priya"
                  maxLength={50}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Avatar</label>
                <div className="grid grid-cols-9 gap-1">
                  {GUEST_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setGuestEmoji(emoji)}
                      className={`h-8 rounded-md text-lg flex items-center justify-center border transition ${
                        guestEmoji === emoji
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      aria-label={`Pick ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {guestError && <p className="text-sm text-red-500">{guestError}</p>}
              {guestSuccess && <p className="text-sm text-emerald-600">{guestSuccess}</p>}

              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Close
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={guestLoading || !guestName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
                >
                  {guestLoading && <Spinner className="h-3.5 w-3.5" />}
                  {guestLoading ? "Adding…" : "Add guest"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
