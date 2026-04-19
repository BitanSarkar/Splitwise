export default function GroupsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 skeleton rounded-md" />
        <div className="h-8 w-24 skeleton rounded-md" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 skeleton rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 skeleton rounded" style={{ width: `${50 + i * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
