export default function InstitutionLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Top Header Skeleton */}
      <div className="border-b border-[#202020] pb-5 space-y-2">
        <div className="h-4 w-36 bg-[#1a1a1a] rounded-lg" />
        <div className="h-8 w-72 sm:w-96 bg-[#1f1f1f] rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-[#111111] border border-[#202020] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-[#1a1a1a] rounded" />
              <div className="h-8 w-8 bg-[#1a1a1a] rounded-xl" />
            </div>
            <div className="h-7 w-32 bg-[#222] rounded-lg" />
            <div className="h-3 w-40 bg-[#161616] rounded" />
          </div>
        ))}
      </div>

      {/* Main Body Skeleton */}
      <div className="rounded-2xl bg-[#111111] border border-[#202020] p-5 sm:p-6 space-y-4">
        {/* Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
          <div className="h-10 w-full sm:w-80 bg-[#161616] rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-24 bg-[#1a1a1a] rounded-xl" />
            <div className="h-9 w-28 bg-[#1a1a1a] rounded-xl" />
          </div>
        </div>

        {/* Rows Skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#1e1e1e]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-[#222] rounded" />
                  <div className="h-2.5 w-20 bg-[#161616] rounded" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <div className="h-3.5 w-24 bg-[#1a1a1a] rounded" />
                <div className="h-6 w-20 bg-[#1a1a1a] rounded-lg" />
              </div>
              <div className="h-8 w-16 bg-[#1a1a1a] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
