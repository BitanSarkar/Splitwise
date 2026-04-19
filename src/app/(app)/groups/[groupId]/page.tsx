import { auth } from "@/auth";
import {
  getGroupDetails,
  getGroupExpenses,
  getGroupBalances,
  getGroupActivity,
} from "@/lib/actions";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { SettleUpDialog } from "@/components/settle-up-dialog";
import { GuestSettleDialog } from "@/components/guest-settle-dialog";
import { BalanceDisplay } from "@/components/balance-display";
import { ExpenseList } from "@/components/expense-list";
import { GroupCharts } from "@/components/group-charts";
import { GroupRealtime } from "@/components/group-realtime";
import { formatDate, simplifyDebts, getDominantCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Download, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { settlements as settlementsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: Props) {
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
  const expenses = await getGroupExpenses(groupId);
  const rawBalances = await getGroupBalances(groupId);
  const activity = await getGroupActivity(groupId);
  const settlementRows = await db
    .select({
      fromUserId: settlementsTable.fromUserId,
      toUserId: settlementsTable.toUserId,
      amount: settlementsTable.amount,
      currency: settlementsTable.currency,
      createdAt: settlementsTable.createdAt,
    })
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, groupId));

  const simplified = simplifyDebts(rawBalances);
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const dominantCurrency = getDominantCurrency(rawBalances);

  const settlementsWithNames = simplified.map((s) => ({
    ...s,
    fromName: memberMap.get(s.from)?.name ?? "Unknown",
    toName: memberMap.get(s.to)?.name ?? "Unknown",
  }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <GroupRealtime groupId={groupId} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl flex-shrink-0">{group.emoji}</span>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{group.name}</h1>
          {group.description && (
            <span className="hidden sm:inline text-sm text-gray-400 truncate">· {group.description}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Link
            href={`/api/groups/${groupId}/export`}
            className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap flex items-center gap-1"
            title="Download balance sheet as Excel"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Link>
          <AddMemberDialog groupId={groupId} />
          <SettleUpDialog groupId={groupId} settlements={settlementsWithNames} currentUserId={currentUserId} />
          <GuestSettleDialog groupId={groupId} members={members} rawBalances={rawBalances} />
          <AddExpenseDialog groupId={groupId} members={members} currentUserId={currentUserId} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left: expenses */}
        <div className="lg:col-span-2 space-y-4">
          <BalanceDisplay
            rawBalances={rawBalances}
            members={members}
            currentUserId={currentUserId}
            defaultCurrency={dominantCurrency}
          />

          {rawBalances.length > 0 && (
            <Link
              href={`/groups/${groupId}/balances`}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">All balances</p>
                <p className="text-xs text-gray-400 mt-0.5">Full pairwise breakdown — including guests</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </Link>
          )}

          <ExpenseList expenses={expenses} members={members} currentUserId={currentUserId} />

          <GroupCharts
            expenses={expenses}
            members={members}
            settlements={settlementRows}
            currentUserId={currentUserId}
          />
        </div>

        {/* Right: members + activity */}
        <div className="space-y-4">
          {/* Members */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members ({members.length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      member.isGuest ? "bg-amber-50" : "bg-emerald-100"
                    }`}
                  >
                    {member.isGuest ? (
                      <span className="text-base leading-none">
                        {member.avatarEmoji ?? "👤"}
                      </span>
                    ) : member.image ? (
                      <Image src={member.image} alt="" width={28} height={28} className="rounded-full" />
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">
                        {member.name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate">
                      {member.name ?? member.email}
                      {member.id === currentUserId && <span className="text-gray-400"> (you)</span>}
                    </p>
                  </div>
                  {member.isGuest ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Guest
                    </span>
                  ) : member.role === "admin" ? (
                    <span className="text-xs text-gray-400">Admin</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</p>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activity.map((item) => (
                  <div key={item.id} className="px-4 py-2.5">
                    <p className="text-xs text-gray-700">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
