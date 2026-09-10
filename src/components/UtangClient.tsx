'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CheckCircle, X, AlertCircle } from 'lucide-react';
import { processTransaction } from '@/app/transaction/actions';

export default function UtangClient({ receivables, payables, physicalWallets, allocations }: any) {
  const [activeTab, setActiveTab] = useState<'LENT' | 'BORROWED'>('LENT');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeList = activeTab === 'LENT' ? receivables : payables;

  const handleOpenModal = (loan: any) => {
    setSelectedLoan(loan);
    setAmount(loan.remaining.toString());
    setWalletId(physicalWallets[0]?.id || '');
    setEnvelopeId(allocations[0]?.id || '');
    setError('');
  };

  const handleSettle = async () => {
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount.');
    if (Number(amount) > selectedLoan.remaining) return setError('Cannot settle more than the remaining balance.');
    if (!walletId) return setError('Please select a physical wallet.');
    if (!envelopeId) return setError('Please select an envelope.');

    setIsSubmitting(true);
    setError('');

    const type = activeTab === 'LENT' ? 'DEBT_COLLECTION' : 'SETTLE_DEBT';
    
    try {
      await processTransaction({
         type,
         amount: Number(amount),
         person_name: selectedLoan.person_name,
         wallet_id: walletId,
         allocation_id: envelopeId,
         parent_transaction_id: selectedLoan.id, // Enforces the new relational tracking
         description: `${type === 'DEBT_COLLECTION' ? 'Collected from' : 'Paid to'} ${selectedLoan.person_name}`
      });
      
      setSelectedLoan(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <main className="flex-1 w-full max-w-md mx-auto flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <Link href="/" className="p-2 -ml-2 text-neutral-500 hover:text-white transition-colors active:scale-95 bg-neutral-900/50 rounded-full">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Debt Tracker</h1>
      </header>

      {/* Tabs */}
      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('LENT')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold tracking-wider transition-colors ${activeTab === 'LENT' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}
        >
          LENT OUT
        </button>
        <button 
          onClick={() => setActiveTab('BORROWED')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold tracking-wider transition-colors ${activeTab === 'BORROWED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}
        >
          BORROWED
        </button>
      </div>

      {/* List Itemization */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 flex flex-col gap-3">
        {activeList.length === 0 ? (
           <div className="text-center text-neutral-500 mt-10 text-sm font-medium">No active {activeTab === 'LENT' ? 'receivables' : 'payables'}.</div>
        ) : (
           activeList.map((loan: any) => {
             const date = new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
             return (
               <div 
                 key={loan.id} 
                 onClick={() => handleOpenModal(loan)}
                 className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-neutral-800 transition-colors active:scale-95"
               >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                       <span className="font-bold text-white text-base capitalize">{loan.person_name}</span>
                       <span className="text-[11px] text-neutral-500 uppercase tracking-widest">{date} • {loan.description}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={`text-lg font-bold tracking-tight ${activeTab === 'LENT' ? 'text-green-400' : 'text-red-400'}`}>
                         ₱{formatMoney(loan.remaining)}
                       </span>
                    </div>
                  </div>
                  
                  {loan.settled > 0 && (
                     <div className="flex justify-between items-center text-xs border-t border-neutral-800 pt-2 mt-1">
                        <span className="text-neutral-500 font-medium">Principal: ₱{formatMoney(loan.principal)}</span>
                        <span className="text-neutral-400 font-medium border border-neutral-700 bg-neutral-800/50 px-2 py-0.5 rounded-md">Settled: ₱{formatMoney(loan.settled)}</span>
                     </div>
                  )}
               </div>
             )
           })
        )}
      </div>

      {/* Explicit Settlement Routing Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 flex flex-col gap-6 animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold tracking-tight text-white capitalize">
                  {activeTab === 'LENT' ? `Collect from ${selectedLoan.person_name}` : `Pay ${selectedLoan.person_name}`}
                </h3>
                <span className="text-sm text-neutral-400">Remaining Balance: <b className="text-white">₱{formatMoney(selectedLoan.remaining)}</b></span>
              </div>
              <button onClick={() => setSelectedLoan(null)} className="p-2 -mt-2 -mr-2 text-neutral-500 hover:text-white bg-neutral-800/50 rounded-full active:scale-95 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Amount to Settle</label>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
                   <input 
                     type="number"
                     value={amount}
                     onChange={e => setAmount(e.target.value)}
                     className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-8 pr-4 text-white font-bold tracking-tight focus:outline-none focus:border-neutral-600 transition-colors"
                     placeholder="0.00"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Target Wallet</label>
                     <select 
                       value={walletId} 
                       onChange={e => setWalletId(e.target.value)}
                       className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-sm text-white font-medium focus:outline-none focus:border-neutral-600 appearance-none"
                     >
                       <option value="" disabled>Select Wallet</option>
                       {physicalWallets.map((w: any) => (
                         <option key={w.id} value={w.id}>{w.name}</option>
                       ))}
                     </select>
                  </div>
                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Target Envelope</label>
                     <select 
                       value={envelopeId} 
                       onChange={e => setEnvelopeId(e.target.value)}
                       className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-sm text-white font-medium focus:outline-none focus:border-neutral-600 appearance-none"
                     >
                       <option value="" disabled>Select Envelope</option>
                       {allocations.map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                       ))}
                     </select>
                  </div>
               </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              onClick={handleSettle}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 ${
                 activeTab === 'LENT' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {isSubmitting ? 'Processing...' : (
                 <>
                   <CheckCircle size={18} /> {activeTab === 'LENT' ? 'Confirm Collection' : 'Confirm Payment'}
                 </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
