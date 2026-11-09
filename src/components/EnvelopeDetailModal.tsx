'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { getEnvelopeDetail } from '@/app/envelope/actions';
import type { EnvelopeDetail } from '@/app/envelope/actions';

interface Props {
  allocationId: string | null;
  allocationName?: string;
  initialBalance?: number;
  showBalances?: boolean;
  onClose: () => void;
}

export default function EnvelopeDetailModal({ 
  allocationId, 
  allocationName, 
  initialBalance, 
  showBalances = true, 
  onClose 
}: Props) {
  const [detail, setDetail] = useState<EnvelopeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'ACTIVE' | 'SETTLED'>('ACTIVE');

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await getEnvelopeDetail(id);
      setDetail(data);
      // If no active lends but has settled, stay on active or switch if needed
      setTab('ACTIVE');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allocationId) {
      fetchDetail(allocationId);
    } else {
      setDetail(null);
    }
  }, [allocationId, fetchDetail]);

  if (!allocationId) return null;

  const formatMoney = (n: number) => {
    if (!showBalances) return '****';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const currentBal = detail ? detail.currentBalance : (initialBalance ?? 0);
  const activeList = detail?.activeLends || [];
  const settledList = detail?.settledLends || [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl flex flex-col max-h-[88dvh] animate-in slide-in-from-bottom duration-300 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-neutral-900">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Envelope Details</span>
            <h2 className="text-xl font-bold tracking-tight text-white">{detail?.name || allocationName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-full text-neutral-400 hover:text-white transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {loading && !detail && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-28 bg-neutral-900 rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 bg-neutral-900 rounded-2xl" />
                <div className="h-20 bg-neutral-900 rounded-2xl" />
              </div>
              <div className="h-32 bg-neutral-900 rounded-2xl" />
            </div>
          )}

          {detail && (
            <>
              {/* PRIMARY CARD: Actually Supposed To Be */}
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-3xl p-5 flex flex-col gap-1.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    Actually Supposed To Be
                  </span>
                  {detail.target_percentage > 0 && (
                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full">
                      {detail.target_percentage}% split
                    </span>
                  )}
                </div>

                <div className="text-3xl font-extrabold tracking-tight text-green-400 mt-1">
                  ₱{formatMoney(detail.supposedBalance)}
                </div>

                <p className="text-[11px] text-neutral-500 font-medium mt-1">
                  {detail.totalOutstandingLent > 0 ? (
                    <>
                      Current (₱{formatMoney(detail.currentBalance)}) + Lent Out (₱{formatMoney(detail.totalOutstandingLent)})
                    </>
                  ) : (
                    'No money lent out. Full balance available.'
                  )}
                </p>
              </div>

              {/* SECONDARY CARDS: Current vs Lent Out */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                    Current Balance
                  </span>
                  <span className={`text-lg font-bold ${currentBal < 0 ? 'text-red-400' : 'text-white'}`}>
                    {currentBal < 0 && showBalances ? '-' : ''}₱{formatMoney(Math.abs(currentBal))}
                  </span>
                </div>

                <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-neutral-500">
                    <ArrowUpRight size={12} className={detail.totalOutstandingLent > 0 ? 'text-orange-400' : ''} />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">
                      Total Lent Out
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${detail.totalOutstandingLent > 0 ? 'text-orange-400' : 'text-neutral-400'}`}>
                    ₱{formatMoney(detail.totalOutstandingLent)}
                  </span>
                </div>
              </div>

              {/* LENT BREAKDOWN SECTION */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] text-neutral-400 uppercase tracking-widest font-bold">
                    Lent From This Envelope
                  </h3>

                  {settledList.length > 0 && (
                    <div className="flex gap-1 p-0.5 bg-neutral-900 rounded-lg text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setTab('ACTIVE')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          tab === 'ACTIVE' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        Active ({activeList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('SETTLED')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          tab === 'SETTLED' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        Paid ({settledList.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* ACTIVE LENDS TAB */}
                {tab === 'ACTIVE' && (
                  <>
                    {activeList.length === 0 ? (
                      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl py-8 px-4 flex flex-col items-center justify-center text-center gap-2">
                        <CheckCircle2 size={24} className="text-neutral-600" />
                        <span className="text-sm font-medium text-neutral-400">No active lends</span>
                        <span className="text-[11px] text-neutral-600">
                          Nothing is currently borrowed from this envelope.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {activeList.map(item => (
                          <div
                            key={item.transaction_id}
                            className="bg-neutral-900/90 border border-neutral-800/70 rounded-2xl p-4 flex items-center justify-between"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-white capitalize">
                                {item.person}
                              </span>
                              <span className="text-[11px] text-neutral-500">
                                {formatDate(item.date)}
                                {item.note ? ` • ${item.note}` : ''}
                              </span>
                              {item.returnedAmount > 0 && (
                                <span className="text-[10px] text-neutral-500">
                                  ₱{formatMoney(item.returnedAmount)} repaid of ₱{formatMoney(item.originalAmount)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end">
                              <span className="text-base font-bold text-orange-400">
                                ₱{formatMoney(item.amount)}
                              </span>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
                                Unpaid
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* SETTLED LENDS TAB */}
                {tab === 'SETTLED' && (
                  <div className="flex flex-col gap-2">
                    {settledList.map(item => (
                      <div
                        key={item.transaction_id}
                        className="bg-neutral-900/40 border border-neutral-800/40 rounded-2xl p-4 flex items-center justify-between opacity-80"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-neutral-300 capitalize">
                              {item.person}
                            </span>
                            <span className="text-[9px] bg-green-500/10 text-green-400 font-bold px-1.5 py-0.5 rounded-full">
                              Settled
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500">
                            {formatDate(item.date)}
                            {item.note ? ` • ${item.note}` : ''}
                          </span>
                        </div>

                        <span className="text-sm font-semibold text-neutral-400 line-through">
                          ₱{formatMoney(item.originalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !detail && (
            <div className="py-12 text-center text-sm text-neutral-500">
              Could not load details for this envelope.
            </div>
          )}
        </div>

        {/* Bottom padding for mobile bar */}
        <div className="pb-6" />
      </div>
    </div>
  );
}
