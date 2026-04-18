import { auth } from "@/auth";
import { joinGroupByToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/join/${token}`)}`);
  }

  let groupId: string;
  try {
    groupId = await joinGroupByToken(token);
  } catch (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h1 className="text-lg font-semibold text-gray-900">Can&apos;t join this group</h1>
          <p className="text-sm text-gray-500 mt-2">
            {err instanceof Error ? err.message : "Invalid or expired invite"}
          </p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm text-emerald-600 hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/groups/${groupId}`);
}
