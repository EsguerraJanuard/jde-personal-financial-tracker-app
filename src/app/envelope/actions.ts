'use server';

import { supabase } from "@/lib/supabase";

export interface LendEntry {
  transaction_id: string;
  person: string;
  amount: number; // outstanding amount currently owed
  originalAmount: number;
  returnedAmount: number;
  date: string;
  isSettled: boolean;
  note?: string;
}

export interface EnvelopeDetail {
  id: string;
  name: string;
  currentBalance: number;
  target_percentage: number;
  totalOutstandingLent: number;
  supposedBalance: number;
  activeLends: LendEntry[];
  settledLends: LendEntry[];
}

export async function getEnvelopeDetail(allocationId: string): Promise<EnvelopeDetail | null> {
  // 1. Fetch the envelope balance and info
  const { data: envelope, error: envErr } = await supabase
    .from('allocation_balances')
    .select('id, name, target_percentage, balance')
    .eq('id', allocationId)
    .single();

  if (envErr || !envelope) return null;

  const currentBalance = Number(envelope.balance || 0);
  const targetPercentage = Number(envelope.target_percentage || 0);

  // 2. Fetch all transactions with wallet and allocation ledgers
  const { data: allTxs, error: txErr } = await supabase
    .from('transactions')
    .select(`
      id, type, parent_transaction_id, description, created_at,
      wallet_ledger ( amount, wallet_id, wallets ( name, group_type ) ),
      allocation_ledger ( amount, allocation_id )
    `)
    .order('created_at', { ascending: false });

  if (txErr || !allTxs) {
    return {
      id: envelope.id,
      name: envelope.name,
      currentBalance,
      target_percentage: targetPercentage,
      totalOutstandingLent: 0,
      supposedBalance: currentBalance,
      activeLends: [],
      settledLends: [],
    };
  }

  const allLends: LendEntry[] = [];

  allTxs.forEach((tx: any) => {
    // Check if transaction is a LEND: wallet_ledger has positive entry in Utang Sakin
    const personLedger = tx.wallet_ledger?.find((l: any) => {
      const w: any = Array.isArray(l.wallets) ? l.wallets[0] : l.wallets;
      return w?.group_type === 'Utang Sakin (Receivable)' && Number(l.amount) > 0;
    });

    if (!personLedger) return;

    const walletInfo: any = Array.isArray(personLedger.wallets) ? personLedger.wallets[0] : personLedger.wallets;
    const personName = walletInfo?.name?.replace(/\u200B/g, '').trim() || 'Unknown';

    // Check if this specific envelope was debited in this loan
    const allocEntry = tx.allocation_ledger?.find(
      (al: any) => al.allocation_id === allocationId && Number(al.amount) < 0
    );

    if (!allocEntry) return;

    const originalDebited = Math.abs(Number(allocEntry.amount));

    // Find settlements that returned money to this envelope for this loan
    const settlements = allTxs.filter((s: any) => s.parent_transaction_id === tx.id);
    let returned = 0;
    settlements.forEach((s: any) => {
      const ret = s.allocation_ledger?.find(
        (al: any) => al.allocation_id === allocationId && Number(al.amount) > 0
      );
      if (ret) {
        returned += Number(ret.amount);
      }
    });

    const outstanding = Math.max(0, originalDebited - returned);
    const isSettled = outstanding <= 0.009;

    allLends.push({
      transaction_id: tx.id,
      person: personName,
      amount: isSettled ? 0 : Number(outstanding.toFixed(2)),
      originalAmount: originalDebited,
      returnedAmount: Number(returned.toFixed(2)),
      date: tx.created_at,
      isSettled,
      note: tx.description || '',
    });
  });

  const activeLends = allLends.filter(l => !l.isSettled);
  const settledLends = allLends.filter(l => l.isSettled);

  const totalOutstandingLent = Number(
    activeLends.reduce((sum, l) => sum + l.amount, 0).toFixed(2)
  );
  const supposedBalance = Number((currentBalance + totalOutstandingLent).toFixed(2));

  return {
    id: envelope.id,
    name: envelope.name,
    currentBalance,
    target_percentage: targetPercentage,
    totalOutstandingLent,
    supposedBalance,
    activeLends,
    settledLends,
  };
}
