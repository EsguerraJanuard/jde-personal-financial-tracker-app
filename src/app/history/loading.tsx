export default function Loading() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      {/* Header Skeleton */}
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <div className="w-9 h-9 bg-neutral-900 rounded-full animate-pulse"></div>
        <div className="h-5 w-40 bg-neutral-800 rounded animate-pulse"></div>
      </header>

      <div className="p-5 flex flex-col gap-5">
        {/* Search & Filter Controls Skeleton */}
        <div className="flex gap-3">
          <div className="flex-1 h-[48px] bg-neutral-900 rounded-xl animate-pulse"></div>
          <div className="w-[130px] h-[48px] bg-neutral-900 rounded-xl animate-pulse"></div>
        </div>

        {/* Transactions List Skeleton */}
        <div className="flex flex-col gap-3 pb-10">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div 
              key={`history-skel-${i}`} 
              className="flex justify-between items-center bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-5 h-[82px] animate-pulse"
            >
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-neutral-800 rounded"></div>
                <div className="h-3 w-20 bg-neutral-800/60 rounded"></div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="h-5 w-24 bg-neutral-700/50 rounded"></div>
                <div className="w-9 h-9 bg-neutral-800/50 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
