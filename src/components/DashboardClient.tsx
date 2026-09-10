'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Plus, ChevronDown, ChevronUp, Settings, ArrowRight } from 'lucide-react';
import TransactionDetailsModal from './TransactionDetailsModal';

export default function DashboardClient({ 
  physicalWallets, 
  receivables, 
  payables, 
  allocations, 
  totalMoney, 
  totalReceivables, 
  totalPayables,
  recentTransactions
}: any) {
  const [show, setShow] = useState(true);
  const [showAllWallets, setShowAllWallets] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const visibleAllocations = allocations
    .filter((a: any) => Number(a.target_percentage) > 0 || a.name.toLowerCase().includes('school allowance'))
    .sort((a: any, b: any) => {
      const aIsSchool = a.name.toLowerCase().includes('school allowance');
      const bIsSchool = b.name.toLowerCase().includes('school allowance');
      if (aIsSchool && !bIsSchool) return -1;
      if (!aIsSchool && bIsSchool) return 1;
      return Number(b.balance) - Number(a.balance);
    });

  const formatMoney = (amount: number) => {
    if (!show) return '****';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const totalPhysical = physicalWallets.reduce((sum: any, w: any) => sum + Number(w.balance), 0);

  const sortedWallets = [...physicalWallets].sort((a, b) => {
    const aPinned = a.is_pinned !== undefined ? a.is_pinned : ['Maribank', 'Cash', 'GCash'].includes(a.name);
    const bPinned = b.is_pinned !== undefined ? b.is_pinned : ['Maribank', 'Cash', 'GCash'].includes(b.name);
    if (aPinned === bPinned) {
      return Number(b.balance) - Number(a.balance);
    }
    return aPinned ? -1 : 1;
  });

  const displayedWallets = showAllWallets ? sortedWallets : sortedWallets.slice(0, 3);

  // Helper to format transaction preview synchronized with Modal Logic
  const formatTx = (tx: any) => {
    let amount = 0;
    let sign = '';
    let color = 'text-white';
    
    let title = tx.type?.replace(/_/g, ' ') || 'Unknown';
    let subtitle = tx.description || '';

    const wFrom = tx.wallet_ledger?.find((l: any) => l.amount < 0);
    const wTo = tx.wallet_ledger?.find((l: any) => l.amount > 0);
    
    // Safely unwrap Vercel array types for wallets
    const sWallet = Array.isArray(wFrom?.wallets) ? wFrom?.wallets[0] : wFrom?.wallets;
    const dWallet = Array.isArray(wTo?.wallets) ? wTo?.wallets[0] : wTo?.wallets;

    // 1. Broad Semantic Interception for Debt offsets
    const isBorrowOffset = tx.allocation_ledger?.some((l: any) => (l.allocations?.name || '').includes('Borrowed'));
    const isLendOffset = tx.allocation_ledger?.some((l: any) => (l.allocations?.name || '').includes('Lent'));
    
    // 2. DECOUPLING LOGIC: Explicitly identify if the destination or source is a human contact
    const isLentToPerson = dWallet?.group_type === 'Utang Sakin (Receivable)';
    const isBorrowedFromPerson = sWallet?.group_type === 'Utang Ko (Payable)';

    // 3. Resolve Core Transaction Title and Colors
    if (isBorrowOffset || tx.type === 'BORROW' || isBorrowedFromPerson) {
       amount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
       color = 'text-green-500';
       sign = '+';
       title = 'Borrow';
    } else if (isLendOffset || tx.type === 'LEND' || isLentToPerson) {
       amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
       color = 'text-red-500'; // Decoupled from blue transfer color
       sign = '-';
       title = 'Lent';
    } else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT' || tx.type === 'MANUAL_ADJUSTMENT') {
       const w = tx.wallet_ledger?.find((l: any) => l.amount > 0);
       amount = w ? w.amount : 0;
       color = 'text-green-500';
       sign = '+';
       title = tx.type === 'INCOME_SPLIT' ? 'Split Income' : 'Direct Income';
    } else if (tx.type === 'EXPENSE') {
       const w = tx.wallet_ledger?.find((l: any) => l.amount < 0);
       amount = w ? Math.abs(w.amount) : 0;
       color = 'text-white';
       sign = '-';
       title = 'Expense';
    } else if (tx.type === 'SETTLE_DEBT') {
       amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
       color = 'text-red-500';
       sign = '-';
       title = 'Settle Debt';
    } else if (tx.type === 'DEBT_COLLECTION') {
       amount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
       color = 'text-green-500';
       sign = '+';
       title = 'Debt Collection';
    } else if (tx.type === 'TRANSFER') {
       const aFrom = tx.allocation_ledger?.find((l: any) => l.amount < 0);
       const aTo = tx.allocation_ledger?.find((l: any) => l.amount > 0);

       const hasWalletMovement = !!(wFrom || wTo);
       const hasEnvelopeMovement = !!(aFrom || aTo);

       if (hasWalletMovement) {
           amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
           color = 'text-blue-500';
           title = 'Wallet Transfer';
       } else if (hasEnvelopeMovement) {
           amount = aFrom ? Math.abs(aFrom.amount) : (aTo ? aTo.amount : 0);
           color = 'text-purple-400'; 
           title = 'Envelope Transfer';
       } else {
           amount = 0;
           color = 'text-neutral-500';
           title = 'Transfer';
       }
    }

    // Embed the decoupled properties into the transaction payload for the Modal
    return {
      ...tx,
      displayTitle: title,
      subtitle: subtitle,
      displayColor: color,
      displaySign: sign,
      displayAmount: amount,
      isLentToPerson,
      isBorrowedFromPerson,
      fromWalletName: sWallet?.name,
      toWalletName: dWallet?.name
    };
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto p-5 flex flex-col gap-8 pb-32 relative">
      
      {/* Settings Icon */}
      <div className="absolute top-6 right-6">
        <Link href="/settings" className="text-neutral-500 hover:text-white transition-colors active:scale-95">
          <Settings size={20} />
        </Link>
      </div>

      {/* 2-Column Prominent Header */}
      <header className="pt-8 pb-2">
        <div className="grid grid-cols-2 gap-4">
           <div className="flex flex-col items-center gap-1">
             <div className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium flex items-center gap-1.5 ml-4">
                Total Balance
                <button onClick={() => setShow(!show)} className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 -m-1">
                  {show ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
             </div>
             <div className="text-3xl font-semibold tracking-tight">₱{formatMoney(totalMoney)}</div>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium">In Wallets</div>
             <div className="text-3xl font-semibold tracking-tight text-white">₱{formatMoney(totalPhysical)}</div>
           </div>
        </div>
      </header>

      {/* Wallets Summary */}
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest">Wallets</h2>
          {sortedWallets.length > 3 && (
            <button 
              onClick={() => setShowAllWallets(!showAllWallets)}
              className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1 hover:text-white transition-colors"
            >
              {showAllWallets ? 'Show Less' : 'Show More'} 
              {showAllWallets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {displayedWallets.map((w: any) => (
            <div key={w.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
              <div className="text-xs text-neutral-400 mb-1 font-medium">{w.name}</div>
              <div className="text-base font-semibold">₱{formatMoney(Number(w.balance))}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Allocations Summary */}
      <section>
        <h2 className="text-[12px] font-medium text-neutral-500 mb-3 uppercase tracking-widest pl-1">Envelopes</h2>
        <div className="grid grid-cols-2 gap-3">
          {visibleAllocations.map((alloc: any) => {
            const bal = Number(alloc.balance);
            const isFullRow = alloc.name.toLowerCase().includes('school allowance');
            return (
              <div 
                key={alloc.id} 
                className={`flex justify-between items-center bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 transition-colors ${isFullRow ? 'col-span-2' : ''}`}
              >
                <div className="truncate pr-2">
                  <div className="text-sm font-medium text-neutral-200 truncate">{alloc.name}</div>
                </div>
                <div className={`text-base font-semibold ${bal < 0 ? 'text-red-400' : ''}`}>
                  {bal < 0 && show ? '-' : ''}₱{formatMoney(Math.abs(bal))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Debt Summary */}
      <section>
        <h2 className="text-[12px] font-medium text-neutral-500 mb-3 uppercase tracking-widest pl-1">Debt Tracker</h2>
        <div className="flex gap-3">
           <Link href="/utang" className="flex-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-1 active:bg-neutral-800 transition-colors">
              <div className="text-xs text-neutral-400 font-medium">Lent</div>
              <div className="text-lg font-semibold text-green-400">
                {show ? '+' : ''}₱{formatMoney(totalReceivables)}
              </div>
           </Link>
           <Link href="/utang" className="flex-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-1 active:bg-neutral-800 transition-colors">
              <div className="text-xs text-neutral-400 font-medium">Borrowed</div>
              <div className="text-lg font-semibold text-red-400">
                {show ? '-' : ''}₱{formatMoney(Math.abs(totalPayables))}
              </div>
           </Link>
        </div>
      </section>

      {/* Recent Transactions Preview */}
      {recentTransactions && recentTransactions.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest">Recent Activity</h2>
            <Link href="/history" className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
              View All <ArrowRight size={10} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx: any) => {
              const parsedTx = formatTx(tx);
              const date = new Date(parsedTx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              return (
                <div 
                  key={parsedTx.id} 
                  onClick={() => setSelectedTx(parsedTx)}
                  className="flex justify-between items-center bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors active:scale-95"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold capitalize truncate max-w-[200px] text-white">{parsedTx.displayTitle}</span>
                    <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[200px]">
                      {date}{parsedTx.subtitle ? ` • ${parsedTx.subtitle}` : ''}
                    </span>
                  </div>
                  <span className={`text-base font-semibold ${parsedTx.displayColor}`}>
                    {show ? `${parsedTx.displaySign}₱${parsedTx.displayAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '****'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Floating Action Button */}
      <Link 
        href="/transaction" 
        className="fixed bottom-8 right-6 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-90 transition-transform z-50"
      >
        <Plus size={32} />
      </Link>

      <TransactionDetailsModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </main>
  );
}
