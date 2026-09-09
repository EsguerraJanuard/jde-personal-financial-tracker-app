export default function Loading() {
  return (
    <div className="flex flex-col h-full relative bg-black min-h-screen">
      {/* Header Skeleton */}
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900">
        <div className="w-9 h-9 bg-neutral-900 rounded-full animate-pulse"></div>
        <div className="h-6 w-36 bg-neutral-800 rounded animate-pulse"></div>
      </header>

      {/* Tabs Skeleton */}
      <div className="p-5 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={`tab-skel-${i}`} className="h-8 bg-neutral-900 rounded-lg animate-pulse"></div>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-6 flex-1">
        
        {/* Amount Field Skeleton */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-full h-[76px] bg-neutral-900 rounded-2xl animate-pulse"></div>
        </div>

        {/* To Wallet Skeleton */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-full h-[54px] bg-neutral-900 rounded-xl animate-pulse"></div>
        </div>

        {/* Distribution Tabs Skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-3 w-24 bg-neutral-800 rounded animate-pulse"></div>
          <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl h-[44px] animate-pulse">
             <div className="flex-1 bg-neutral-800/50 rounded-lg"></div>
             <div className="flex-1 bg-neutral-800/50 rounded-lg"></div>
          </div>
        </div>

        {/* Note Field Skeleton */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="h-3 w-28 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-full h-[54px] bg-neutral-900 rounded-xl animate-pulse"></div>
        </div>

        {/* Submit Button Skeleton */}
        <div className="mt-4 mb-4 w-full h-[52px] bg-neutral-800/50 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  );
}
