'use client';

import { useState, useRef } from 'react';
import { processTransaction } from '@/app/transaction/actions';
import { ArrowLeft, ChevronDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function TransactionForm({ wallets, allocations }: any) {
  const [tab, setTab] = useState<'INCOME' | 'EXPENSE' | 'LEND' | 'BORROW' | 'TRANSFER'>('INCOME');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for scrolling to errors
  const amountRef = useRef<HTMLDivElement>(null);
  const personRef = useRef<HTMLDivElement>(null);
  const lendSourceRef = useRef<HTMLDivElement>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isDirect, setIsDirect] = useState(false);
  
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [allocationId, setAllocationId] = useState(allocations[0]?.id || '');
  
  // Lend Specific
  const [personName, setPersonName] = useState('');
  const [lendSources, setLendSources] = useState([{ id: Date.now(), allocation_id: allocations[0]?.id || '', amount: '' }]);

  // Expense Specific
  const [expenseSources, setExpenseSources] = useState([{ id: Date.now(), allocation_id: allocations[0]?.id || '', amount: '' }]);

  // Transfer Specific
  const [transferType, setTransferType] = useState<'WALLET' | 'ENVELOPE'>('WALLET');
  const [transferToWalletId, setTransferToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [transferToAllocId, setTransferToAllocId] = useState(allocations[1]?.id || allocations[0]?.id || '');

  const remainingLend = Number(amount) - lendSources.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const remainingExpense = Number(amount) - expenseSources.reduce((sum, s) => sum + Number(s.amount || 0), 0);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!amount || Number(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
      amountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    if (tab === 'LEND') {
      if (!personName.trim()) {
        newErrors.personName = "Required";
        if (!newErrors.amount) personRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (Number(amount) > 0 && remainingLend !== 0) {
        newErrors.lendSource = `Remaining balance must be exactly 0`;
        if (!newErrors.amount && !newErrors.personName) lendSourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (tab === 'BORROW') {
      if (!personName.trim()) {
        newErrors.personName = "Required";
        if (!newErrors.amount) personRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (tab === 'EXPENSE') {
      if (Number(amount) > 0 && remainingExpense !== 0) {
        newErrors.expenseSource = `Remaining balance must be exactly 0`;
      }
    }

    if (tab === 'TRANSFER') {
      if (transferType === 'WALLET' && walletId === transferToWalletId) {
        newErrors.transfer = "Source and destination wallets must be different";
      }
      if (transferType === 'ENVELOPE' && allocationId === transferToAllocId) {
        newErrors.transfer = "Source and destination envelopes must be different";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setShowConfirm(true);
  };

  const [successData, setSuccessData] = useState<{ type: string, amount: number, splitBreakdown: any[] | null } | null>(null);

  const confirmTransaction = async () => {
    setLoading(true);
    setShowConfirm(false);
    
    let type = tab === 'INCOME' ? (isDirect ? 'INCOME_DIRECT' : 'INCOME_SPLIT') : tab;
    
    try {
      const res = await processTransaction({
        type,
        amount: Number(amount),
        wallet_id: walletId,
        allocation_id: allocationId,
        person_name: personName.trim(),
        lend_sources: tab === 'LEND' ? lendSources.map(s => ({ allocation_id: s.allocation_id, amount: Number(s.amount) })) : [],
        expense_sources: tab === 'EXPENSE' ? expenseSources.map(s => ({ allocation_id: s.allocation_id, amount: Number(s.amount) })) : [],
        description,
        is_direct: isDirect,
        transfer_type: tab === 'TRANSFER' ? transferType : undefined,
        from_id: tab === 'TRANSFER' ? (transferType === 'WALLET' ? walletId : allocationId) : undefined,
        to_id: tab === 'TRANSFER' ? (transferType === 'WALLET' ? transferToWalletId : transferToAllocId) : undefined
      });
      
      if (res.success) {
        setSuccessData({ type, amount: Number(amount), splitBreakdown: res.splitBreakdown });
      }
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const Select = ({ value, onChange, children }: any) => (
    <div className="relative">
      <select 
        value={value} 
        onChange={onChange}
        className="w-full bg-neutral-900 rounded-xl p-4 pr-12 text-sm font-medium outline-none appearance-none border border-transparent focus:border-neutral-700 transition-colors cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={18} />
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900">
        <Link href="/" className="p-2 -ml-2 bg-neutral-900 rounded-full active:scale-95 transition-transform"><ArrowLeft size={20} /></Link>
        <h1 className="font-semibold text-lg">New Transaction</h1>
      </header>

      <div className="p-5 grid grid-cols-5 gap-1.5">
        {(['INCOME', 'EXPENSE', 'LEND', 'BORROW', 'TRANSFER'] as const).map(t => (
          <button 
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setErrors({});
            }}
            className={`py-2 text-[9px] font-bold rounded-lg uppercase tracking-wider transition-colors ${tab === t ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6 flex-1" noValidate>
        
        {/* AMOUNT */}
        <div className="flex flex-col gap-2" ref={amountRef}>
          <div className="flex justify-between items-end">
            <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Amount</label>
            {errors.amount && <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><AlertCircle size={10} /> {errors.amount}</span>}
          </div>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-medium text-neutral-400">₱</span>
            <input 
              type="number" step="0.01"
              value={amount} onChange={e => { setAmount(e.target.value); setErrors(prev => ({...prev, amount: ''})); }}
              className={`w-full bg-neutral-900 rounded-2xl pl-12 pr-4 py-5 text-3xl font-semibold outline-none transition-shadow ${errors.amount ? 'ring-1 ring-red-500/50' : 'focus:ring-2 focus:ring-neutral-700'}`}
              placeholder="0"
            />
          </div>
        </div>

        {/* FROM / TO WALLET — hidden for BORROW & TRANSFER */}
        {tab !== 'BORROW' && tab !== 'TRANSFER' && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">
              {tab === 'INCOME' ? 'To Wallet' : 'From Wallet'}
            </label>
            <Select value={walletId} onChange={(e: any) => setWalletId(e.target.value)}>
              {wallets.map((w: any) => <option key={w.id} value={w.id}>{w.name} (₱{Number(w.balance || 0).toLocaleString()})</option>)}
            </Select>
          </div>
        )}

        {/* INCOME TABS */}
        {tab === 'INCOME' && (
          <div className="flex flex-col gap-3">
            <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Distribution</label>
            <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl">
               <button type="button" onClick={() => setIsDirect(false)} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold ${!isDirect ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Split</button>
               <button type="button" onClick={() => setIsDirect(true)} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold ${isDirect ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Direct</button>
            </div>
            
            {isDirect && (
              <Select value={allocationId} onChange={(e: any) => setAllocationId(e.target.value)}>
                {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
              </Select>
            )}
          </div>
        )}

        {/* EXPENSE TAB */}
        {tab === 'EXPENSE' && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">From Envelopes</label>
              {errors.expenseSource ? (
                <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><AlertCircle size={10} /> {errors.expenseSource}</span>
              ) : (
                <span className={`text-[10px] font-bold uppercase tracking-widest ${Math.abs(remainingExpense) < 0.01 ? 'text-green-400' : 'text-orange-400'}`}>
                  Remaining: ₱{remainingExpense.toLocaleString()}
                </span>
              )}
            </div>

            {expenseSources.map((source, idx) => (
              <div key={source.id} className="flex gap-2">
                <select 
                  value={source.allocation_id}
                  onChange={e => {
                    const newSources = [...expenseSources];
                    newSources[idx].allocation_id = e.target.value;
                    setExpenseSources(newSources);
                    setErrors(prev => ({...prev, expenseSource: ''}));
                  }}
                  className="flex-1 bg-neutral-900 rounded-xl px-3 py-4 text-sm font-medium outline-none border border-transparent focus:border-neutral-700"
                >
                  {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
                </select>
                <input 
                  type="number" step="0.01" placeholder="₱0"
                  value={source.amount}
                  onChange={e => {
                    const newSources = [...expenseSources];
                    newSources[idx].amount = e.target.value;
                    setExpenseSources(newSources);
                    setErrors(prev => ({...prev, expenseSource: ''}));
                  }}
                  className="w-24 bg-neutral-900 rounded-xl px-3 py-4 text-sm font-semibold outline-none text-right border border-transparent focus:border-neutral-700"
                />
              </div>
            ))}
            
            {expenseSources.length < 3 && (
              <button 
                type="button" 
                onClick={() => setExpenseSources([...expenseSources, { id: Date.now(), allocation_id: allocations[0]?.id || '', amount: '' }])}
                className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 py-3 border border-neutral-800 rounded-xl border-dashed active:bg-neutral-900 transition-colors"
              >
                + Add Envelope
              </button>
            )}
          </div>
        )}

        {/* LEND TAB */}
        {tab === 'LEND' && (
          <>
            <div className="flex flex-col gap-2" ref={personRef}>
              <div className="flex justify-between items-end">
                <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">For (Person)</label>
                {errors.personName && <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><AlertCircle size={10} /> {errors.personName}</span>}
              </div>
              <input 
                type="text" 
                value={personName} onChange={e => { setPersonName(e.target.value); setErrors(prev => ({...prev, personName: ''})); }}
                className={`w-full bg-neutral-900 rounded-xl px-5 py-4 text-sm font-medium outline-none transition-shadow ${errors.personName ? 'ring-1 ring-red-500/50' : 'focus:ring-2 focus:ring-neutral-700'}`}
                placeholder="e.g. Kuya ER"
              />
            </div>

            <div className="flex flex-col gap-2" ref={lendSourceRef}>
              <div className="flex justify-between items-end">
                 <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Source Envelopes</label>
                 {errors.lendSource ? (
                    <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><AlertCircle size={10} /> {errors.lendSource}</span>
                 ) : (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${remainingLend === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                      Remaining: ₱{remainingLend.toLocaleString()}
                    </span>
                 )}
              </div>
              
              <div className="flex flex-col gap-3">
                {lendSources.map((source, idx) => (
                  <div key={source.id} className="flex gap-2">
                    <div className="flex-1">
                      <Select 
                        value={source.allocation_id} 
                        onChange={(e: any) => {
                          const newSources = [...lendSources];
                          newSources[idx].allocation_id = e.target.value;
                          setLendSources(newSources);
                        }}
                      >
                        {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
                      </Select>
                    </div>
                    <input 
                      type="number" placeholder="₱0"
                      value={source.amount}
                      onChange={e => {
                        const newSources = [...lendSources];
                        newSources[idx].amount = e.target.value;
                        setLendSources(newSources);
                        setErrors(prev => ({...prev, lendSource: ''}));
                      }}
                      className="w-24 bg-neutral-900 rounded-xl px-3 py-4 text-sm font-semibold outline-none text-right border border-transparent focus:border-neutral-700"
                    />
                  </div>
                ))}
                
                {lendSources.length < 3 && (
                  <button 
                    type="button" 
                    onClick={() => setLendSources([...lendSources, { id: Date.now(), allocation_id: allocations[0]?.id || '', amount: '' }])}
                    className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 py-3 border border-neutral-800 rounded-xl border-dashed active:bg-neutral-900 transition-colors"
                  >
                    + Add Envelope
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* BORROW TAB */}
        {tab === 'BORROW' && (
          <div className="flex flex-col gap-2" ref={personRef}>
            <div className="flex justify-between items-end">
              <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Borrowed From</label>
              {errors.personName && <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><AlertCircle size={10} /> {errors.personName}</span>}
            </div>
            <input 
              type="text" 
              value={personName} onChange={e => { setPersonName(e.target.value); setErrors(prev => ({...prev, personName: ''})); }}
              className={`w-full bg-neutral-900 rounded-xl px-5 py-4 text-sm font-medium outline-none transition-shadow ${errors.personName ? 'ring-1 ring-red-500/50' : 'focus:ring-2 focus:ring-neutral-700'}`}
              placeholder="e.g. Mama"
            />
          </div>
        )}

        {/* TRANSFER TAB */}
        {tab === 'TRANSFER' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl">
               <button type="button" onClick={() => setTransferType('WALLET')} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold ${transferType === 'WALLET' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Wallet to Wallet</button>
               <button type="button" onClick={() => setTransferType('ENVELOPE')} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold ${transferType === 'ENVELOPE' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Envelope to Envelope</button>
            </div>

            {errors.transfer && (
              <div className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                <AlertCircle size={10} /> {errors.transfer}
              </div>
            )}

            {transferType === 'WALLET' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">From Wallet</label>
                  <Select value={walletId} onChange={(e: any) => { setWalletId(e.target.value); setErrors(prev => ({...prev, transfer: ''})); }}>
                    {wallets.map((w: any) => <option key={w.id} value={w.id}>{w.name} (₱{Number(w.balance || 0).toLocaleString()})</option>)}
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">To Wallet</label>
                  <Select value={transferToWalletId} onChange={(e: any) => { setTransferToWalletId(e.target.value); setErrors(prev => ({...prev, transfer: ''})); }}>
                    {wallets.map((w: any) => <option key={w.id} value={w.id}>{w.name} (₱{Number(w.balance || 0).toLocaleString()})</option>)}
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">From Envelope</label>
                  <Select value={allocationId} onChange={(e: any) => { setAllocationId(e.target.value); setErrors(prev => ({...prev, transfer: ''})); }}>
                    {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">To Envelope</label>
                  <Select value={transferToAllocId} onChange={(e: any) => { setTransferToAllocId(e.target.value); setErrors(prev => ({...prev, transfer: ''})); }}>
                    {allocations.map((a: any) => <option key={a.id} value={a.id}>{a.name} (₱{Number(a.balance).toLocaleString()})</option>)}
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {/* NOTE */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Note (Optional)</label>
          <input 
            type="text" 
            value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-neutral-900 rounded-xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-neutral-700 transition-shadow"
            placeholder="e.g. Gas, Grocery"
          />
        </div>

        {/* SUBMIT */}
        <button 
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 mb-4 bg-white text-black font-bold rounded-2xl py-4 text-[13px] uppercase tracking-widest shadow-lg shadow-white/5 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'Processing...' : `Review & Save`}
        </button>
      </form>

      {/* FIXED CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-1 tracking-tight">Confirm Transaction</h3>
              <p className="text-neutral-400 text-xs">Please review the details before saving.</p>
            </div>
            
            <div className="bg-black/50 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Type</span>
                <span className="font-bold uppercase text-xs text-right">{tab} {tab === 'INCOME' && (isDirect ? '(Direct)' : '(Split)')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Amount</span>
                <span className="font-bold text-xl">₱{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {(tab === 'LEND' || tab === 'BORROW') && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 font-medium">{tab === 'LEND' ? 'For' : 'From'}</span>
                  <span className="font-medium text-white">{personName}</span>
                </div>
              )}
              {tab === 'TRANSFER' && transferType === 'WALLET' && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-medium">From Wallet</span>
                    <span className="font-medium text-white">{wallets.find((w: any) => w.id === walletId)?.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-medium">To Wallet</span>
                    <span className="font-medium text-white">{wallets.find((w: any) => w.id === transferToWalletId)?.name}</span>
                  </div>
                </>
              )}
              {tab === 'TRANSFER' && transferType === 'ENVELOPE' && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-medium">From Envelope</span>
                    <span className="font-medium text-white">{allocations.find((a: any) => a.id === allocationId)?.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-medium">To Envelope</span>
                    <span className="font-medium text-white">{allocations.find((a: any) => a.id === transferToAllocId)?.name}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 bg-neutral-800 hover:text-white transition-colors active:scale-95">
                Cancel
              </button>
              <button onClick={confirmTransaction} disabled={loading} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95">
                {loading ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold mb-1 tracking-tight">Success!</h3>
              <p className="text-neutral-400 text-sm">Transaction has been saved.</p>
            </div>
            
            {successData.splitBreakdown && (
              <div className="bg-black/50 rounded-2xl p-5 flex flex-col gap-3">
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Split Summary (Centavo Rule)</h4>
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                  {successData.splitBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-neutral-300">{item.name}</span>
                      <span className="font-bold text-green-400">+₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/" className="mt-2 w-full flex items-center justify-center py-4 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95">
              Done
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
