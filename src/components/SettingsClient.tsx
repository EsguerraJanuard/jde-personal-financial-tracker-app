'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, X, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { saveSettings } from '@/app/settings/actions';
import { useRouter } from 'next/navigation';

export default function SettingsClient({ allocations, wallets }: { allocations: any[], wallets: any[] }) {
  const router = useRouter();
  
  // Clone allocations to state for editing
  const [envs, setEnvs] = useState<any[]>(allocations.map(a => ({ ...a, target_percentage: Number(a.target_percentage) })));
  const [newEnvs, setNewEnvs] = useState<any[]>([]);
  const [newWallets, setNewWallets] = useState<any[]>([]);
  
  // Pinned Wallets State
  const initialPinned = wallets.filter(w => w.is_pinned).map(w => w.id);
  const [pinnedWalletIds, setPinnedWalletIds] = useState<string[]>(initialPinned.length > 0 ? initialPinned : wallets.slice(0,3).map(w => w.id));
  
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const togglePin = (id: string) => {
    setPinnedWalletIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  const handleEnvChange = (id: string, field: string, value: string) => {
    setEnvs(prev => prev.map(e => {
      if (e.id === id) {
        if (field === 'target_percentage') {
          let num = Number(value);
          if (isNaN(num)) num = 0;
          return { ...e, target_percentage: num };
        }
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleNewEnvChange = (index: number, field: string, value: string) => {
    setNewEnvs(prev => {
      const copy = [...prev];
      if (field === 'target_percentage') {
         let num = Number(value);
         if (isNaN(num)) num = 0;
         copy[index][field] = num;
      } else {
         copy[index][field] = value;
      }
      return copy;
    });
  };

  const addNewEnv = () => {
    setNewEnvs(prev => [...prev, { name: '', target_percentage: 0 }]);
  };

  const removeNewEnv = (index: number) => {
    setNewEnvs(prev => prev.filter((_, i) => i !== index));
  };

  const addNewWallet = () => {
    setNewWallets(prev => [...prev, { name: '' }]);
  };

  const removeNewWallet = (index: number) => {
    setNewWallets(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewWalletChange = (index: number, value: string) => {
    setNewWallets(prev => {
      const copy = [...prev];
      copy[index].name = value;
      return copy;
    });
  };

  const totalPercentage = 
    envs.reduce((sum, e) => sum + e.target_percentage, 0) + 
    newEnvs.reduce((sum, e) => sum + e.target_percentage, 0);

  // Note: Your custom budget logic specifically requires "her birthday" and "offering" to each be exactly 5 percent. 
  // However, I will leave this generic for now to allow you to adjust the numbers freely.
  const isValid = (totalPercentage === 100 && envs.every(e => e.name.trim() !== '') && newEnvs.every(e => e.name.trim() !== '') && newWallets.every(w => w.name.trim() !== '') && pinnedWalletIds.length > 0 && pinnedWalletIds.length <= 3);

  const handleSave = async () => {
    if (!isValid) return;
    setLoading(true);
    setShowConfirm(false);
    
    try {
      const updates = envs.filter(e => {
        const original = allocations.find(a => a.id === e.id);
        return original && (original.target_percentage !== e.target_percentage || original.name !== e.name);
      });

      await saveSettings({
        updates,
        newEnvelopes: newEnvs,
        pinnedWalletIds,
        newWallets
      });

      setShowSuccess(true);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      <header className="flex items-center gap-4 p-5 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <Link href="/" className="p-2 -ml-2 bg-neutral-900 rounded-full active:scale-95 transition-transform"><ArrowLeft size={20} /></Link>
        <h1 className="font-semibold text-lg flex-1">Settings</h1>
      </header>

      <div className="p-5 flex flex-col gap-8 pb-32">
        
        {/* Pinned Wallets (Moved to Top) */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-end pl-1">
            <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest">Dashboard Wallets</h2>
            <span className="text-[10px] font-bold text-neutral-400">{pinnedWalletIds.length} / 3 Selected</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {wallets.map(w => {
              const isPinned = pinnedWalletIds.includes(w.id);
              return (
                <button 
                  key={w.id}
                  onClick={() => togglePin(w.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isPinned ? 'bg-white text-black border-white' : 'bg-neutral-900/40 border-neutral-800 text-neutral-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isPinned ? 'border-black' : 'border-neutral-600'}`}>
                    {isPinned && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                  </div>
                  <span className="font-bold text-sm truncate">{w.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium px-2 mt-1">Select up to 3 wallets to display prominently on your dashboard.</p>
        </section>

        {/* New Wallets Section */}
        {newWallets.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest pl-1">New Wallets</h2>
            <div className="flex flex-col gap-2">
              {newWallets.map((wallet, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-neutral-900/60 border border-neutral-700/50 rounded-2xl p-4 relative">
                  <button onClick={() => removeNewWallet(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full active:scale-90">
                    <X size={14} />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Wallet Name (e.g. CIMB, Crypto)"
                    value={wallet.name}
                    onChange={(e) => handleNewWalletChange(idx, e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-3 px-4 text-sm font-bold focus:ring-1 focus:ring-neutral-600 outline-none text-white"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add Wallet Button */}
        <button 
          onClick={addNewWallet}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm font-bold text-neutral-400 hover:text-white transition-colors active:scale-95"
        >
          <Plus size={18} /> Add New Wallet
        </button>

        <hr className="border-neutral-900/50" />

        <div className="flex flex-col gap-6">
          {/* Percentage Indicator (Now Sticky) */}
          <div className={`sticky top-[73px] z-10 p-4 rounded-3xl flex items-center justify-between gap-4 border shadow-2xl backdrop-blur-md transition-colors ${
            totalPercentage === 100 ? 'bg-green-900/20 border-green-500/30' : 
            totalPercentage > 100 ? 'bg-red-900/20 border-red-500/30' : 'bg-neutral-900/80 border-neutral-800'
          }`}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Total Distribution</span>
              {totalPercentage > 100 && (
                <span className="text-[9px] text-red-400 font-bold tracking-widest uppercase">Exceeds by {totalPercentage - 100}%</span>
              )}
              {totalPercentage < 100 && (
                <span className="text-[9px] text-yellow-500 font-bold tracking-widest uppercase">Missing {100 - totalPercentage}%</span>
              )}
              {totalPercentage === 100 && (
                <span className="text-[9px] text-green-400 font-bold tracking-widest uppercase">Perfectly Balanced</span>
              )}
            </div>
            
            <div className="flex items-end gap-0.5 bg-black/40 px-4 py-2 rounded-2xl">
              <span className={`text-3xl font-bold tracking-tight leading-none ${totalPercentage === 100 ? 'text-green-400' : totalPercentage > 100 ? 'text-red-400' : 'text-white'}`}>
                {totalPercentage}
              </span>
              <span className="text-sm font-bold text-neutral-500 pb-0.5">%</span>
            </div>
          </div>

          {/* Existing Envelopes */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest pl-1">Envelope Percentages</h2>
            <div className="flex flex-col gap-2">
              {envs.map((env) => (
                <div key={env.id} className="flex justify-between items-center bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 gap-2">
                  <input 
                    type="text" 
                    value={env.name}
                    onChange={(e) => handleEnvChange(env.id, 'name', e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-lg py-1.5 px-3 text-sm font-bold text-white focus:ring-1 focus:ring-neutral-600 outline-none"
                    placeholder="Envelope Name"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={env.target_percentage}
                      onChange={(e) => handleEnvChange(env.id, 'target_percentage', e.target.value)}
                      className="w-16 bg-black border border-neutral-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold focus:ring-1 focus:ring-neutral-600 outline-none"
                    />
                    <span className="text-neutral-500 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* New Envelopes */}
          {newEnvs.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[12px] font-medium text-neutral-500 uppercase tracking-widest pl-1">New Envelopes</h2>
              <div className="flex flex-col gap-2">
                {newEnvs.map((env, idx) => (
                  <div key={idx} className="flex flex-col gap-3 bg-neutral-900/60 border border-neutral-700/50 rounded-2xl p-4 relative">
                    <button onClick={() => removeNewEnv(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full active:scale-90">
                      <X size={14} />
                    </button>
                    <input 
                      type="text" 
                      placeholder="Envelope Name (e.g. Travel)"
                      value={env.name}
                      onChange={(e) => handleNewEnvChange(idx, 'name', e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-xl py-3 px-4 text-sm font-bold focus:ring-1 focus:ring-neutral-600 outline-none"
                    />
                    <div className="flex items-center gap-2 self-end">
                      <span className="text-xs text-neutral-500 font-medium">Allocation:</span>
                      <input 
                        type="number" 
                        value={env.target_percentage}
                        onChange={(e) => handleNewEnvChange(idx, 'target_percentage', e.target.value)}
                        className="w-16 bg-black border border-neutral-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold focus:ring-1 focus:ring-neutral-600 outline-none"
                      />
                      <span className="text-neutral-500 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add Envelope Button */}
          <button 
            onClick={addNewEnv}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm font-bold text-neutral-400 hover:text-white transition-colors active:scale-95"
          >
            <Plus size={18} /> Add New Envelope
          </button>
        </div>

      </div>

      {/* Save FAB */}
      {isValid && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50">
           <button 
             onClick={() => setShowConfirm(true)}
             className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 transition-transform"
           >
             <Save size={18} /> Save Settings
           </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-1 tracking-tight">Save Changes?</h3>
              <p className="text-neutral-400 text-xs px-2">
                This will update your settings and wallet configuration.
              </p>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 bg-neutral-800 hover:text-white transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading} 
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95"
              >
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold mb-1 tracking-tight">Saved!</h3>
              <p className="text-neutral-400 text-sm">Settings updated successfully.</p>
            </div>
            <button 
              onClick={() => {
                setShowSuccess(false);
                router.push('/');
              }} 
              className="mt-2 w-full flex items-center justify-center py-4 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
