export default function Loading() {
  return (
    <main className="flex-1 w-full max-w-md mx-auto p-5 flex flex-col gap-8 pb-32 relative">
      
      {/* Settings Icon Skeleton */}
      <div className="absolute top-6 right-6">
        <div className="w-5 h-5 rounded-md bg-neutral-800 animate-pulse"></div>
      </div>

      {/* 2-Column Prominent Header Skeleton */}
      <header className="pt-8 pb-2">
        <div className="grid grid-cols-2 gap-4">
           <div className="flex flex-col items-center gap-1">
             <div className="flex items-center gap-1.5 ml-4">
                <div className="h-3 w-20 bg-neutral-800/80 rounded animate-pulse"></div>
                <div className="w-3 h-3 rounded-full bg-neutral-800/80 animate-pulse"></div>
             </div>
             <div className="h-9 w-32 bg-neutral-800 rounded animate-pulse mt-1"></div>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="h-3 w-16 bg-neutral-800/80 rounded animate-pulse"></div>
             <div className="h-9 w-32 bg-neutral-800 rounded animate-pulse mt-1"></div>
           </div>
        </div>
      </header>

      {/* Wallets Summary Skeleton */}
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <div className="h-3 w-16 bg-neutral-800/60 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={`wallet-skel-${i}`} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-center items-center h-[76px] animate-pulse">
              <div className="h-3 w-12 bg-neutral-800 rounded mb-2"></div>
              <div className="h-5 w-16 bg-neutral-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Allocations Summary Skeleton */}
      <section>
        <div className="mb-3 pl-1">
          <div className="h-3 w-20 bg-neutral-800/60 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={`alloc-skel-${i}`} 
              className={`flex justify-between items-center bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 h-[58px] animate-pulse ${i === 1 ? 'col-span-2' : ''}`}
            >
              <div className={`h-3 ${i === 1 ? 'w-32' : 'w-16'} bg-neutral-800 rounded`}></div>
              <div className="h-4 w-12 bg-neutral-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Debt Summary Skeleton */}
      <section>
        <div className="mb-3 pl-1">
          <div className="h-3 w-24 bg-neutral-800/60 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-3">
           {[1, 2].map((i) => (
             <div key={`debt-skel-${i}`} className="flex-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-1.5 h-[76px] animate-pulse">
                <div className="h-3 w-12 bg-neutral-800 rounded"></div>
                <div className="h-5 w-20 bg-neutral-700/50 rounded mt-0.5"></div>
             </div>
           ))}
        </div>
      </section>

      {/* Recent Transactions Preview Skeleton */}
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <div className="h-3 w-24 bg-neutral-800/60 rounded animate-pulse"></div>
          <div className="h-3 w-12 bg-neutral-800/60 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={`tx-skel-${i}`} className="flex justify-between items-center bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 h-[68px] animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-3.5 w-24 bg-neutral-800 rounded"></div>
                <div className="h-2 w-12 bg-neutral-800/60 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-neutral-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Action Button Skeleton */}
      <div className="fixed bottom-8 right-6 w-16 h-16 bg-neutral-200/20 rounded-full animate-pulse z-50"></div>
    </main>
  );
}
