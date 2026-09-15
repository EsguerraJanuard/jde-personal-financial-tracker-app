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

  // Infinite Money Glitch Mitigation: Verify transaction hasn't already been reversed
  const { data: existingReversal } = await supabase
    .from('transactions')
    .select('id')
    .like('description', `[REVERSAL] ${transactionId}%`)
    .maybeSingle();

  if (existingReversal) throw new Error('This transaction has already been reversed.');

  // 2. Insert Reversal Transaction Header (Embedding ID to prevent duplicate reversals)
  const insertPayload: any = { 
    type: tx.type, 
    description: `[REVERSAL] ${transactionId} ${tx.description || tx.type}` 
  };
  
  if (tx.parent_transaction_id) {
    insertPayload.parent_transaction_id = tx.parent_transaction_id;
  }

  const { data: revTx, error: revError } = await supabase
    .from('transactions')
    .insert([insertPayload])
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
