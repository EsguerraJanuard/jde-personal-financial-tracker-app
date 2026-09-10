import { X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { deleteTransaction } from '@/app/transaction/delete';

export default function TransactionDetailsModal({ tx, onClose }: { tx: any, onClose: (deleted?: boolean) => void }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!tx) return null;

  const dateObj = new Date(tx.created_at);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  let mainAmount = 0;
  let typeLabel = tx.type?.replace(/_/g, ' ') || 'Unknown';
  let color = 'text-white';
  
  let fromWallet = '';
  let toWallet = '';
  let toWalletLabel = 'To Wallet';
  
  let personName = '';
  let personLabel = '';

  // 1. Unpack ledgers safely to handle Vercel's strict array types
  const wFrom = tx.wallet_ledger?.find((l: any) => l.amount < 0);
  const wTo = tx.wallet_ledger?.find((l: any) => l.amount > 0);
  const sWallet = Array.isArray(wFrom?.wallets) ? wFrom?.wallets[0] : wFrom?.wallets;
  const dWallet = Array.isArray(wTo?.wallets) ? wTo?.wallets[0] : wTo?.wallets;

  // 2. Broad Semantic Interception (Bypasses trailing spaces or legacy types)
  const isBorrowOffset = tx.allocation_ledger?.some((l: any) => (l.allocations?.name || '').includes('Borrowed'));
  const isLendOffset = tx.allocation_ledger?.some((l: any) => (l.allocations?.name || '').includes('Lent'));
  const isLentToPerson = dWallet?.group_type === 'Utang Sakin (Receivable)';
  const isBorrowedFromPerson = sWallet?.group_type === 'Utang Ko (Payable)';
  
  // 3. Map Transactions & Decouple Contacts from Wallets
  if (isBorrowOffset || tx.type === 'BORROW' || isBorrowedFromPerson) {
     mainAmount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
     color = 'text-green-500';
     typeLabel = 'Borrow';
     personName = sWallet?.name || 'Unknown';
     personLabel = 'Lender';
     toWallet = dWallet?.name || '';
     toWalletLabel = 'To Wallet';
  } else if (isLendOffset || tx.type === 'LEND' || isLentToPerson) {
     mainAmount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
     color = 'text-red-500';
     typeLabel = 'Lent';
     personName = dWallet?.name || 'Unknown';
     personLabel = 'Borrower';
     fromWallet = sWallet?.name || ''; // Maintain origin wallet display
  } else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT' || tx.type === 'MANUAL_ADJUSTMENT') {
     const w = tx.wallet_ledger?.find((l: any) => l.amount > 0);
     mainAmount = w ? w.amount : 0;
     color = 'text-green-500';
     typeLabel = tx.type === 'INCOME_SPLIT' ? 'Split Income' : 'Direct Income';
     toWallet = dWallet?.name || 'Unknown';
  } else if (tx.type === 'EXPENSE') {
     const w = tx.wallet_ledger?.find((l: any) => l.amount < 0);
     mainAmount = w ? Math.abs(w.amount) : 0;
     color = 'text-white';
     typeLabel = 'Expense';
     fromWallet = sWallet?.name || 'Unknown';
  } else if (tx.type === 'SETTLE_DEBT') {
     mainAmount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
     color = 'text-red-500';
     typeLabel = 'Settle Debt';
     personName = dWallet?.name || 'Unknown';
     personLabel = 'Paid To';
     fromWallet = sWallet?.name || '';
  } else if (tx.type === 'DEBT_COLLECTION') {
     mainAmount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
     color = 'text-green-500';
     typeLabel = 'Debt Collection';
     personName = sWallet?.name || 'Unknown';
     personLabel = 'Collected From';
     toWallet = dWallet?.name || '';
     toWalletLabel = 'To Wallet';
  } else if (tx.type === 'TRANSFER') {
     const aFrom = tx.allocation_ledger?.find((l: any) => l.amount < 0);
     const aTo = tx.allocation_ledger?.find((l: any) => l.amount > 0);

     const hasWalletMovement = !!(wFrom || wTo);
     const hasEnvelopeMovement = !!(aFrom || aTo);

     if (hasWalletMovement) {
         mainAmount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
         color = 'text-blue-500';
         typeLabel = 'Wallet Transfer';
         fromWallet = sWallet?.name || 'Unknown';
         toWallet = dWallet?.name || 'Unknown';
         toWalletLabel = 'To Wallet';
     } else if (hasEnvelopeMovement) {
         mainAmount = aFrom ? Math.abs(aFrom.amount) : (aTo ? aTo.amount : 0);
         color = 'text-purple-400'; 
         typeLabel = 'Envelope Transfer';
     }
  }

  // 4. Bulletproof Metadata Filtering
  const validAllocations = tx.allocation_ledger?.filter((l: any) => {
    const allocName = l.allocations?.name || '';
    return !allocName.includes('Lent') && !allocName.includes('Borrowed');
  }) || [];

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTransaction(tx.id);
      onClose(true);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold tracking-tight capitalize text-white">{tx.description || typeLabel}</h3>
              <span className="text-[11px] text-neutral-500 font-semibold tracking-wider uppercase">{dateStr} • {timeStr}</span>
            </div>
            <div className="flex items-center gap-2 -mt-2 -mr-2">
              <button onClick={() => setShowConfirmDelete(true)} className="p-2 text-neutral-500 hover:text-red-500 transition-colors bg-neutral-800/50 rounded-full active:scale-90">
                <Trash2 size={18} />
              </button>
              <button onClick={() => onClose()} className="p-2 text-neutral-500 hover:text-white transition-colors bg-neutral-800/50 rounded-full active:scale-90">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-black/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 border border-neutral-800/50">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Total Amount</span>
            <span className={`text-3xl font-bold tracking-tight ${color}`}>
              {typeLabel === 'Lent' || typeLabel === 'Expense' || typeLabel === 'Settle Debt' ? '-' : (typeLabel === 'Borrow' || typeLabel === 'Direct Income' || typeLabel === 'Split Income' || typeLabel === 'Debt Collection' ? '+' : '')}₱{mainAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Details List */}
          <div className="flex flex-col gap-3 px-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500 font-medium">Type</span>
              <span className="font-semibold text-white">{typeLabel}</span>
            </div>

            {personName && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">{personLabel}</span>
                <span className="font-semibold text-neutral-200 capitalize">{personName}</span>
              </div>
            )}

            {fromWallet && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">From Wallet</span>
                <span className="font-semibold text-neutral-200">{fromWallet}</span>
              </div>
            )}

            {toWallet && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">{toWalletLabel}</span>
                <span className="font-semibold text-neutral-200">{toWallet}</span>
              </div>
            )}
          </div>

          {/* Envelopes Breakdown */}
          {validAllocations.length > 0 && (
            <div className="bg-neutral-800/30 rounded-2xl p-4 flex flex-col gap-3 border border-neutral-800/50">
              <h4 className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Envelope Breakdown</h4>
              <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-2">
                {validAllocations.map((l: any, idx: number) => {
                  const isPositive = l.amount > 0;
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-neutral-300">{l.allocations?.name || 'Unknown'}</span>
                      <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-neutral-200'}`}>
                        {isPositive ? '+' : '-'}₱{Math.abs(l.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CONFIRM DELETE OVERLAY MODAL */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-1 tracking-tight">Delete Transaction?</h3>
              <p className="text-neutral-400 text-xs px-2">
                This will automatically reverse its effect on your wallet and envelope balances. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShowConfirmDelete(false)} 
                disabled={isDeleting}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 bg-neutral-800 hover:text-white transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                disabled={isDeleting} 
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-colors active:scale-95"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
