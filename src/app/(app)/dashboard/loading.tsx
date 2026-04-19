export default function DashboardLoading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 bg-gray-200 rounded-md skeleton" />
        <div className="h-8 w-24 bg-gray-200 rounded-md skeleton" />
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 space-y-2">
            <div className="h-2.5 w-12 skeleton rounded" />
            <div className="h-6 w-16 skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Groups header */}
      <div className="h-3 w-20 skeleton rounded" />

      {/* Group list */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 skeleton rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 skeleton rounded" style={{ width: `${55 + i * 12}%` }} />
              <div className="h-2.5 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
