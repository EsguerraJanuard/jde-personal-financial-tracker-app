'use client';

import { ArrowLeft, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import SettleDebtModal from './SettleDebtModal';

export default function UtangClient({ receivables, payables, physicalWallets, allocations }: any) {
  const [tab, setTab] = useState<'lent' | 'borrowed'>('lent');
  const [settlePerson, setSettlePerson] = useState<any>(null);

  const data = tab === 'lent' ? receivables : payables;

  const totalLent = receivables.reduce((sum: any, item: any) => sum + Number(item.balance), 0);
  const totalBorrowed = payables.reduce((sum: any, item: any) => sum + Math.abs(Number(item.balance)), 0);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'No date';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' • ' + 
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <Link href="/" className="p-2 -ml-2 bg-neutral-900 rounded-full active:scale-95 transition-transform"><ArrowLeft size={20} /></Link>
        <h1 className="font-semibold text-lg flex-1">Debt Tracker</h1>
      </header>

      <div className="p-5 flex flex-col gap-6 pb-20">
        
        {/* Toggle Tabs */}
        <div className="flex p-1 bg-neutral-900 rounded-2xl">
          <button 
            onClick={() => setTab('lent')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'lent' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-500'}`}
          >
            Lent (₱{totalLent.toLocaleString()})
          </button>
          <button 
            onClick={() => setTab('borrowed')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'borrowed' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-500'}`}
          >
            Borrowed (₱{totalBorrowed.toLocaleString()})
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {data.length === 0 ? (
            <div className="py-20 text-center text-neutral-500 flex flex-col items-center gap-2">
              <UserCircle2 size={48} className="opacity-20" />
              <p className="text-sm font-medium">No outstanding records found.</p>
            </div>
          ) : (
            data.map((item: any) => (
              <div 
                key={item.id} 
                onClick={() => setSettlePerson(item)}
                className="flex justify-between items-center bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800 active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${tab === 'lent' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm capitalize">{item.name}</span>
                    <span className="text-[10px] text-neutral-500 font-medium tracking-wide">{formatDate(item.last_active)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-bold tracking-tight ${tab === 'lent' ? 'text-blue-400' : 'text-red-400'}`}>
                    ₱{Math.abs(Number(item.balance)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      <SettleDebtModal 
        person={settlePerson} 
        isReceivable={tab === 'lent'}
        physicalWallets={physicalWallets}
        allocations={allocations}
        onClose={() => setSettlePerson(null)} 
      />
    </div>
  );
}
