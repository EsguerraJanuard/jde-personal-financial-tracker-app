'use client';

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { processSettlement } from '@/app/transaction/settle';

export default function SettleDebtModal({ person, isReceivable, physicalWallets, allocations, onClose }: any) {
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(physicalWallets[0]?.id || '');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isSplit, setIsSplit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize destinations and amount when person changes
  useEffect(() => {
    if (person) {
      setAmount(Math.abs(Number(person.balance || 0)).toString());
      if (isReceivable && person.defaultDestinations && person.defaultDestinations.length > 0) {
        // Known source envelopes — pre-populate so money returns to where it came from
        setDestinations(person.defaultDestinations.map((d: any) => ({ ...d })));
      } else if (!isReceivable) {
        // Paying a debt — start with one blank envelope row
        setDestinations([{ id: Date.now(), allocation_id: allocations[0]?.id || '', amount: Math.abs(Number(person.balance || 0)).toString() }]);
      } else {
        // Receiving payment, no known source — no envelope distribution, just goes to wallet
        setDestinations([]);
      }
    }
  }, [person, allocations, isReceivable]);

  const [loading, setLoading] = useState(false);

  if (!person) return null;

  const maxAmount = Math.abs(Number(person.balance));
  const numAmount = Number(amount);
  
  const hasKnownDestinations = isReceivable && person.defaultDestinations && person.defaultDestinations.length > 0;
  
  // Auto-calculate proportional returns for Receive Payment
  let displayDestinations = destinations;
  if (isReceivable) {
     const sourceDests = hasKnownDestinations ? person.defaultDestinations : destinations;
     const totalDefault = sourceDests.reduce((sum: any, d: any) => sum + Number(d.amount), 0);
     if (totalDefault > 0) {
        displayDestinations = sourceDests.map((d: any) => ({
           ...d,
           amount: ((Number(d.amount) / totalDefault) * numAmount).toFixed(2)
        }));
     }
  }

  const remaining = isReceivable ? 0 : numAmount - destinations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const handleSettle = async () => {
    if (numAmount <= 0) return alert("Amount must be greater than 0");
    if (numAmount > maxAmount) return alert("You cannot settle more than the outstanding balance.");

    if (!isReceivable && !isSplit && Math.abs(remaining) > 0.01) {
       return alert("Please allocate the exact remaining amount across envelopes.");
    }

    setLoading(true);
    try {
      await processSettlement({
        personWalletId: person.id,
        isReceivable,
        amount: numAmount,
        physicalWalletId: walletId,
        destinations: isReceivable ? displayDestinations : destinations,
        isSplit: !isReceivable ? isSplit : false
      });
      onClose(true);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold tracking-tight text-white">{isReceivable ? 'Receive Payment' : 'Pay Debt'}</h3>
            <span className="text-xs text-neutral-400 capitalize">{person.name} • Bal: ₱{maxAmount.toLocaleString()}</span>
          </div>
          <button onClick={() => onClose()} className="p-2 -mr-2 -mt-2 text-neutral-500 hover:text-white transition-colors bg-neutral-800/50 rounded-full active:scale-90">
            <X size={18} />
          </button>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Amount to Settle</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">₱</span>
            <input 
              type="number" step="0.01" max={maxAmount}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-black rounded-xl pl-8 pr-4 py-3 text-lg font-semibold outline-none focus:ring-1 focus:ring-neutral-700 border border-neutral-800"
            />
          </div>
        </div>

        {/* Wallet */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">{isReceivable ? 'Receive Into Wallet' : 'Pay From Wallet'}</label>
          <select 
            value={walletId} onChange={e => setWalletId(e.target.value)}
            className="w-full bg-black rounded-xl px-4 py-3 text-sm font-medium outline-none border border-neutral-800 focus:border-neutral-700"
          >
            {physicalWallets.map((w: any) => <option key={w.id} value={w.id}>{w.name} (₱{Number(w.balance || 0).toLocaleString()})</option>)}
          </select>
        </div>

        {/* Envelope Routing */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
              {isReceivable ? (hasKnownDestinations ? 'Route Money To Envelope (Auto)' : 'Envelope Routing') : 'Take Money From Envelope'}
            </label>
          {!isReceivable && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${Math.abs(remaining) < 0.01 ? 'text-green-400' : 'text-orange-400'}`}>
              From Envelope
            </span>
          )}
          </div>

          {isReceivable && hasKnownDestinations && (
            <div className="flex flex-col gap-2 bg-black rounded-xl p-3 border border-neutral-800">
              {displayDestinations.map((dest, idx) => {
                 const allocName = allocations.find((a: any) => a.id === dest.allocation_id)?.name || 'Unknown';
                 return (
                   <div key={idx} className="flex justify-between items-center text-sm font-medium">
                     <span className="text-neutral-400">{allocName}</span>
                     <span className="text-green-400">+₱{Number(dest.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                 );
              })}
            </div>
          )}

          {isReceivable && !hasKnownDestinations && (
            <div className="flex items-center gap-2 bg-black rounded-xl p-3 border border-neutral-800 border-dashed">
              <span className="text-xs text-neutral-500">No source envelopes on record — payment goes directly to wallet.</span>
            </div>
          )}

          {!isReceivable && (
            <div className="flex flex-col gap-2">
              <select 
                value={destinations[0]?.allocation_id || ''}
                onChange={e => setDestinations([{ ...destinations[0], allocation_id: e.target.value }])}
                className="w-full bg-black rounded-xl px-4 py-3 text-sm font-medium outline-none border border-neutral-800 focus:border-neutral-700"
              >
                {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Submit */}
        <button 
          onClick={() => setShowConfirm(true)} disabled={loading}
          className="mt-2 w-full py-4 rounded-xl font-bold text-[13px] uppercase tracking-widest text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95 disabled:opacity-50"
        >
          Review Settlement
        </button>

      </div>
      
      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="text-center">
              <h3 className="text-xl font-bold tracking-tight text-white">Confirm Settlement</h3>
              <p className="text-neutral-400 text-xs mt-1">Please review the settlement details.</p>
            </div>
            
            <div className="bg-black/50 rounded-2xl p-5 flex flex-col gap-4 border border-neutral-800/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Type</span>
                <span className="font-bold text-white uppercase text-xs">{isReceivable ? 'Receive Payment' : 'Pay Debt'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Person</span>
                <span className="font-bold text-white capitalize">{person.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Amount</span>
                <span className="font-bold text-xl text-white">₱{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Wallet</span>
                <span className="font-medium text-white">{physicalWallets.find((w: any) => w.id === walletId)?.name}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShowConfirm(false)} disabled={loading}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 bg-neutral-800 hover:text-white transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleSettle} disabled={loading}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
