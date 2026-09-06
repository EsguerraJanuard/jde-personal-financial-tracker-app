'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function processSettlement({
  personWalletId,
  isReceivable,
  amount,
  physicalWalletId,
  destinations, // array of {allocation_id, amount}
  isSplit
}: any) {
  
  if (amount <= 0) throw new Error("Invalid amount");

  const { data: tx, error: txError } = await supabase.from('transactions').insert([{
    type: 'TRANSFER',
    description: isReceivable ? 'Received Debt Payment' : 'Paid Debt',
  }]).select('id').single();

  if (txError) throw new Error(txError.message);
  const txId = tx.id;

  // 1. Update Wallets
  const wLedger = [];
  if (isReceivable) {
     wLedger.push({ transaction_id: txId, wallet_id: physicalWalletId, amount: amount });
     wLedger.push({ transaction_id: txId, wallet_id: personWalletId, amount: -amount });
  } else {
     wLedger.push({ transaction_id: txId, wallet_id: physicalWalletId, amount: -amount });
     wLedger.push({ transaction_id: txId, wallet_id: personWalletId, amount: amount });
  }
  await supabase.from('wallet_ledger').insert(wLedger);

  // 2. Update Envelopes (Allocations)
  const offsetName = isReceivable ? 'Lent Money (Offset)' : 'Borrowed Money (Offset)';
  let { data: offsetAlloc } = await supabase.from('allocations').select('id').eq('name', offsetName).single();
  if (!offsetAlloc) {
     const { data: newAlloc } = await supabase.from('allocations').insert([{ name: offsetName, target_percentage: 0 }]).select('id').single();
     if (newAlloc) offsetAlloc = newAlloc;
  }
  const offsetId = offsetAlloc?.id;

  const aLedger = [];
  
  if (isReceivable) {
     if (destinations && destinations.length > 0) {
        // Known source envelopes — reverse the offset and return to each envelope proportionally
        aLedger.push({ transaction_id: txId, allocation_id: offsetId, amount: -amount });
        for (const dest of destinations) {
           const destAmt = Number(dest.amount);
           if (destAmt > 0) {
              aLedger.push({ transaction_id: txId, allocation_id: dest.allocation_id, amount: destAmt });
           }
        }
     }
     // If destinations is empty: the money was seeded directly into envelopes (no offset was created).
     // The wallet swap (person wallet ↓, physical wallet ↑) is self-balancing at net 0.
     // No alloc entries needed — the envelopes already "contain" this money.
  } else {
     // We pay them: Offset gets +, chosen envelope gets -
     aLedger.push({ transaction_id: txId, allocation_id: offsetId, amount: amount });
     const chosenId = destinations[0]?.allocation_id;
     if (chosenId) {
        aLedger.push({ transaction_id: txId, allocation_id: chosenId, amount: -amount });
     }
  }

  if (aLedger.length > 0) {
     await supabase.from('allocation_ledger').insert(aLedger);
  }

  revalidatePath('/');
  revalidatePath('/utang');
  revalidatePath('/history');
  return { success: true };
}
