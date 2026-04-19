import { auth } from "@/auth";
import { getGroupDetails, getGroupBalances } from "@/lib/actions";
import { DetailedBalances } from "@/components/detailed-balances";
import { GroupRealtime } from "@/components/group-realtime";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupBalancesPage({ params }: Props) {
  const { groupId } = await params;
  const session = await auth();
  const currentUserId = session!.user!.id!;

  let groupData;
  try {
    groupData = await getGroupDetails(groupId);
  } catch {
    notFound();
  }
  const { group, members } = groupData;
  const rawBalances = await getGroupBalances(groupId);

  return (
    <div className="space-y-4 sm:space-y-5">
      <GroupRealtime groupId={groupId} />

      <div className="flex items-center gap-2 min-w-0">
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="text-gray-300 mx-1">·</span>
        <span className="text-xl sm:text-2xl flex-shrink-0">{group.emoji}</span>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
          {group.name}
        </h1>
        <span className="text-sm text-gray-400 truncate">· All balances</span>
      </div>

      <DetailedBalances
        rawBalances={rawBalances}
        members={members}
        currentUserId={currentUserId}
      />
    </div>
  );
}
