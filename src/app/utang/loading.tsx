export default function Loading() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      {/* Header Skeleton */}
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <div className="w-9 h-9 bg-neutral-900 rounded-full animate-pulse"></div>
        <div className="h-6 w-32 bg-neutral-800 rounded animate-pulse"></div>
      </header>

      <div className="p-5 flex flex-col gap-6 pb-20">
        
        {/* Toggle Tabs Skeleton */}
        <div className="flex p-1 bg-neutral-900 rounded-2xl animate-pulse">
          <div className="flex-1 py-3 h-[44px] bg-neutral-800/50 rounded-xl mr-1"></div>
          <div className="flex-1 py-3 h-[44px] bg-neutral-800/50 rounded-xl"></div>
        </div>

        {/* List Skeleton */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={`utang-skel-${i}`} 
              className="flex justify-between items-center bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 h-[74px] animate-pulse"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-neutral-800"></div>
                {/* Name & Date */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-24 bg-neutral-800 rounded"></div>
                  <div className="h-2.5 w-32 bg-neutral-800/60 rounded"></div>
                </div>
              </div>
              
              {/* Amount */}
              <div className="flex items-center gap-4">
                <div className="h-6 w-20 bg-neutral-700/50 rounded"></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
