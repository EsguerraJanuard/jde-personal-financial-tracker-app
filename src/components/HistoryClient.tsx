'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteTransaction } from '@/app/transaction/delete';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import TransactionDetailsModal from './TransactionDetailsModal';

// Interfaces for strict typing
interface LedgerEntry {
  amount: number;
  wallets?: { name: string; group_type?: string } | { name: string; group_type?: string }[];
  allocations?: { name: string } | { name: string }[];
}

interface Transaction {
  id: string;
  type: string;
  description: string;
  created_at: string;
  wallet_ledger: LedgerEntry[];
  allocation_ledger: LedgerEntry[];
}

export default function HistoryClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [monthFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select(`
        id, type, description, created_at,
        wallet_ledger ( amount, wallets ( name, group_type ) ),
        allocation_ledger ( amount, allocations ( name ) )
      `)
      .neq('description', 'Initial System Seeding')
      .order('created_at', { ascending: false });

    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999); 
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching transactions:", error);
    if (data) setTransactions(data as unknown as Transaction[]);
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(txToDelete);
      setTransactions(prev => prev.filter(tx => tx.id !== txToDelete));
      setTxToDelete(null);
      setSelectedTx(null);
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete: ' + err.message); 
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTx = (tx: Transaction) => {
    let amount = 0;
    let sign = '';
    let color = 'text-white';
    let title = tx.description || tx.type.replace(/_/g, ' ');

    const wFrom = tx.wallet_ledger?.find(l => l.amount < 0);
    const wTo = tx.wallet_ledger?.find(l => l.amount > 0);
    
    // Safely unwrap Vercel array types for wallets
    const sWallet: any = Array.isArray(wFrom?.wallets) ? wFrom?.wallets[0] : wFrom?.wallets;
    const dWallet: any = Array.isArray(wTo?.wallets) ? wTo?.wallets[0] : wTo?.wallets;

    // 1. Broad Semantic Interception for Debt offsets
    const isBorrowOffset = tx.allocation_ledger?.some(l => {
       const allocName = Array.isArray(l.allocations) ? l.allocations[0]?.name : l.allocations?.name;
       return (allocName || '').includes('Borrowed');
    });
    const isLendOffset = tx.allocation_ledger?.some(l => {
       const allocName = Array.isArray(l.allocations) ? l.allocations[0]?.name : l.allocations?.name;
       return (allocName || '').includes('Lent');
    });
    
    // 2. DECOUPLING LOGIC: Explicitly identify if the destination or source is a human contact
    const isLentToPerson = dWallet?.group_type === 'Utang Sakin (Receivable)';
    const isBorrowedFromPerson = sWallet?.group_type === 'Utang Ko (Payable)';

    // 3. Resolve Core Transaction Title and Colors
    if (isBorrowOffset || tx.type === 'BORROW' || isBorrowedFromPerson) {
       amount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
       color = 'text-green-500';
       sign = '+';
       if (!tx.description) title = 'Borrow';
    } else if (isLendOffset || tx.type === 'LEND' || isLentToPerson) {
       amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
       color = 'text-red-500'; // Decoupled from blue transfer color
       sign = '-';
       if (!tx.description) title = 'Lent';
    } else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT' || tx.type === 'MANUAL_ADJUSTMENT') {
       const w = tx.wallet_ledger?.find(l => l.amount > 0);
       amount = w ? w.amount : 0;
       color = 'text-green-500';
       sign = '+';
       if (!tx.description) title = tx.type === 'INCOME_SPLIT' ? 'Split Income' : 'Direct Income';
    } else if (tx.type === 'EXPENSE') {
       const w = tx.wallet_ledger?.find(l => l.amount < 0);
       amount = w ? Math.abs(w.amount) : 0;
       color = 'text-white';
       sign = '-';
       if (!tx.description) title = 'Expense';
    } else if (tx.type === 'SETTLE_DEBT') {
       amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
       color = 'text-red-500';
       sign = '-';
       if (!tx.description) title = 'Settle Debt';
    } else if (tx.type === 'DEBT_COLLECTION') {
       amount = wTo ? wTo.amount : (wFrom ? Math.abs(wFrom.amount) : 0);
       color = 'text-green-500';
       sign = '+';
       if (!tx.description) title = 'Debt Collection';
    } else if (tx.type === 'TRANSFER') {
       const aFrom = tx.allocation_ledger?.find(l => l.amount < 0);
       const aTo = tx.allocation_ledger?.find(l => l.amount > 0);

       const hasWalletMovement = !!(wFrom || wTo);
       const hasEnvelopeMovement = !!(aFrom || aTo);

       if (hasWalletMovement) {
           amount = wFrom ? Math.abs(wFrom.amount) : (wTo ? wTo.amount : 0);
           color = 'text-blue-500';
           if (!tx.description) title = 'Wallet Transfer';
       } else if (hasEnvelopeMovement) {
           amount = aFrom ? Math.abs(aFrom.amount) : (aTo ? aTo.amount : 0);
           color = 'text-purple-400'; 
           if (!tx.description) title = 'Envelope Transfer';
       }
    }

    return { title, amount, sign, color };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      const title = (tx.description || tx.type.replace(/_/g, ' ')).toLowerCase();
      return title.includes(searchLower);
    });
  }, [transactions, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <Link href="/" className="p-2 -ml-2 bg-neutral-900 rounded-full active:scale-95 transition-transform"><ArrowLeft size={20} /></Link>
        <h1 className="font-semibold text-lg flex-1">Transaction History</h1>
      </header>

      <div className="p-5 flex flex-col gap-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-neutral-700 transition-shadow"
            />
          </div>
          <input 
             type="month"
             value={monthFilter}
             onChange={(e) => setMonthFilter(e.target.value)}
             style={{ colorScheme: 'dark' }}
             className="bg-neutral-900 rounded-xl px-4 py-3.5 text-sm text-neutral-300 outline-none w-[130px] border border-transparent focus:border-neutral-700"
          />
        </div>

        <div className="flex flex-col gap-3 pb-10">
          {loading ? (
            <div className="text-center py-10 text-neutral-500 text-sm font-medium">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-sm font-medium">No transactions found.</div>
          ) : (
            filteredTransactions.map((tx) => {
              const { title, amount, sign, color } = formatTx(tx);
              const dateObj = new Date(tx.created_at);
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

              return (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="flex justify-between items-center bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-5 relative group overflow-hidden cursor-pointer hover:bg-neutral-800/40 transition-colors active:scale-95"
                >
                  <div className="flex flex-col gap-1 pr-4">
                    <span className="text-sm font-bold capitalize truncate max-w-[180px] text-white tracking-wide">{title}</span>
                    <span className="text-[10px] text-neutral-500 font-semibold tracking-wider uppercase">{dateStr} • {timeStr}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold tracking-tight ${color}`}>
                      {sign}₱{amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTxToDelete(tx.id);
                      }}
                      className="text-neutral-600 hover:text-red-500 transition-colors p-2 -mr-2 active:scale-90"
                      title="Delete Transaction"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {txToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
                onClick={() => setTxToDelete(null)} 
                disabled={isDeleting}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 bg-neutral-800 hover:text-white transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting} 
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-colors active:scale-95"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionDetailsModal 
        tx={selectedTx} 
        onClose={(deleted?: boolean) => {
          if (deleted && selectedTx) {
            setTransactions(prev => prev.filter(t => t.id !== selectedTx.id));
          }
          setSelectedTx(null);
        }} 
      />
    </div>
  );
}
