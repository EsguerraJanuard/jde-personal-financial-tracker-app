'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(transactionId: string) {
  // 1. Fetch the original transaction and its ledgers
  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*, wallet_ledger(*), allocation_ledger(*)')
    .eq('id', transactionId)
    .single();

  if (fetchError || !tx) throw new Error('Transaction not found');
  if (tx.description?.startsWith('[REVERSAL]')) throw new Error('Cannot delete a reversal transaction');

  // 2. Insert Reversal Transaction Header
  const { data: revTx, error: revError } = await supabase
    .from('transactions')
    .insert([{ 
      type: tx.type, 
      description: `[REVERSAL] ${tx.description || tx.type}` 
    }])
    .select('id')
    .single();

  if (revError) throw new Error(revError.message);
  const revTxId = revTx.id;

  // 3. Counter-balance Wallet Ledger
  if (tx.wallet_ledger && tx.wallet_ledger.length > 0) {
    const revWalletLedger = tx.wallet_ledger.map((l: any) => ({
      transaction_id: revTxId,
      wallet_id: l.wallet_id,
      amount: -l.amount
    }));
    await supabase.from('wallet_ledger').insert(revWalletLedger);
  }

  // 4. Counter-balance Allocation Ledger
  if (tx.allocation_ledger && tx.allocation_ledger.length > 0) {
    const revAllocLedger = tx.allocation_ledger.map((l: any) => ({
      transaction_id: revTxId,
      allocation_id: l.allocation_id,
      amount: -l.amount
    }));
    await supabase.from('allocation_ledger').insert(revAllocLedger);
  }

  // (Optional) We cannot flag the original as `is_voided` without a DB schema change.
  // Instead, the existence of the [REVERSAL] transaction provides the architectural equivalent.
  
  revalidatePath('/');
  revalidatePath('/history');
}
