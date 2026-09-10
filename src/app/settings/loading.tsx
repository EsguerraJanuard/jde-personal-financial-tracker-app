export default function Loading() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      {/* Header Skeleton */}
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <div className="w-9 h-9 bg-neutral-900 rounded-full animate-pulse"></div>
        <div className="h-6 w-24 bg-neutral-800 rounded animate-pulse"></div>
      </header>

      <div className="p-5 flex flex-col gap-8 pb-32">
        
        {/* Pinned Wallets Skeleton (Moved to Top) */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-end pl-1">
            <div className="h-3 w-32 bg-neutral-800 rounded animate-pulse"></div>
            <div className="h-2.5 w-20 bg-neutral-800/60 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={`pin-skel-${i}`} className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 h-[54px] animate-pulse">
                <div className="w-5 h-5 rounded-full bg-neutral-800"></div>
                <div className="h-4 w-16 bg-neutral-700/50 rounded"></div>
              </div>
            ))}
          </div>
          <div className="h-2.5 w-64 bg-neutral-800/60 rounded px-2 mt-1 animate-pulse"></div>
        </section>

        {/* Add Wallet Button Skeleton */}
        <div className="w-full h-[54px] bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse"></div>

        <hr className="border-neutral-900/50" />

        <div className="flex flex-col gap-6">
          {/* Percentage Indicator Skeleton (Now Sticky) */}
          <div className="sticky top-[73px] z-10 p-4 rounded-3xl flex items-center justify-between gap-4 border border-neutral-800 bg-neutral-900/80 h-[82px] shadow-2xl backdrop-blur-md animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-28 bg-neutral-800 rounded"></div>
              <div className="h-2 w-20 bg-neutral-800/60 rounded"></div>
            </div>
            
            <div className="w-24 h-[44px] bg-neutral-800/50 rounded-2xl"></div>
          </div>

          {/* Existing Envelopes Skeleton */}
          <section className="flex flex-col gap-3">
            <div className="pl-1">
              <div className="h-3 w-36 bg-neutral-800 rounded animate-pulse"></div>
            </div>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={`env-skel-${i}`} className="flex justify-between items-center bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 h-[64px] animate-pulse">
                  <div className="h-4 w-28 bg-neutral-700/50 rounded"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-8 bg-neutral-800 rounded-lg"></div>
                    <div className="w-3 h-4 bg-neutral-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Add Envelope Button Skeleton */}
          <div className="w-full h-[54px] bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse"></div>
        </div>

      </div>
    </div>
  );
}
