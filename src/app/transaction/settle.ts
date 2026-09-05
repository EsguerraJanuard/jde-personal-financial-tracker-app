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
  let { data: offsetAlloc } = await supabase.from('allocations').select('id').eq('name', 'Lent Money (Offset)').single();
  if (!offsetAlloc) {
     const { data: newAlloc } = await supabase.from('allocations').insert([{ name: 'Lent Money (Offset)', target_percentage: 0 }]).select('id').single();
     if (newAlloc) offsetAlloc = newAlloc;
  }
  const offsetId = offsetAlloc?.id;

  const aLedger = [];
  
  if (isReceivable) {
     // Offset goes down (debt is cleared)
     aLedger.push({ transaction_id: txId, allocation_id: offsetId, amount: -amount });
     
     // Only distribute to envelopes if we know where the money came from
     if (destinations && destinations.length > 0) {
        for (const dest of destinations) {
           const destAmt = Number(dest.amount);
           if (destAmt > 0) {
              aLedger.push({ transaction_id: txId, allocation_id: dest.allocation_id, amount: destAmt });
           }
        }
     }
     // If no destinations — money goes straight to the physical wallet, offset absorbs it. No envelope entry needed.
  } else {
     // We pay them: Real Envelopes get -, Offset gets +
     aLedger.push({ transaction_id: txId, allocation_id: offsetId, amount: amount });
     
     if (isSplit) {
        const { data: allocs } = await supabase.from('allocations').select('*');
        for (const a of (allocs || [])) {
          if (a.target_percentage > 0) {
             const splitAmt = amount * (a.target_percentage / 100);
             if (splitAmt > 0) {
                aLedger.push({ transaction_id: txId, allocation_id: a.id, amount: -splitAmt });
             }
          }
        }
     } else {
        for (const dest of destinations) {
           const destAmt = Number(dest.amount);
           if (destAmt > 0) {
              aLedger.push({ transaction_id: txId, allocation_id: dest.allocation_id, amount: -destAmt });
           }
        }
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
