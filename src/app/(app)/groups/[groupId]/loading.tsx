export default function GroupLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Group header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 skeleton rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <div className="h-5 w-36 skeleton rounded" />
            <div className="h-3 w-24 skeleton rounded" />
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="h-8 w-16 skeleton rounded-md" />
          <div className="h-8 w-20 skeleton rounded-md" />
          <div className="h-8 w-20 skeleton rounded-md" />
        </div>
      </div>

      {/* Members strip */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-8 skeleton rounded-full" />
        ))}
      </div>

      {/* Balance card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="h-10 skeleton rounded-lg" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 skeleton rounded flex-1" />
              <div className="h-3 w-4 skeleton rounded" />
              <div className="h-4 skeleton rounded flex-1" />
              <div className="h-4 w-16 skeleton rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Expense list */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="h-3 w-24 skeleton rounded" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="h-8 w-8 skeleton rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 skeleton rounded" style={{ width: `${45 + i * 9}%` }} />
              <div className="h-2.5 skeleton rounded w-2/5" />
            </div>
            <div className="h-4 w-14 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
