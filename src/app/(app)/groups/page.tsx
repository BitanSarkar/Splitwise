import { getMyGroups } from "@/lib/actions";
import Link from "next/link";

export default async function GroupsPage() {
  const groups = await getMyGroups();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Groups</h1>
        <Link
          href="/groups/new"
          className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
        >
          + New Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-lg p-10 text-center">
          <p className="text-gray-500 text-sm">No groups yet.</p>
          <Link href="/groups/new" className="mt-3 inline-block text-sm text-emerald-600 hover:underline">
            Create your first group →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <span className="text-xl">{group.emoji}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{group.name}</p>
                {group.description && (
                  <p className="text-xs text-gray-500">{group.description}</p>
                )}
              </div>
              <span className="ml-auto text-gray-400 text-xs">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
