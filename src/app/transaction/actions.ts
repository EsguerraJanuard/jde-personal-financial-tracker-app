'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function processTransaction(payload: any) {
  const { type, amount, wallet_id, allocation_id, person_name, lend_sources, description, is_direct } = payload;
  
  let dbType = type;
  if (type === 'LEND') dbType = 'TRANSFER';
  if (type === 'INCOME_DIRECT') dbType = 'MANUAL_ADJUSTMENT';
  if (type === 'INCOME_SPLIT') dbType = 'INCOME_SPLIT';

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert([{ type: dbType, description }])
    .select('id')
    .single();
    
  if (txError) throw new Error(txError.message);
  const txId = tx.id;

  let splitBreakdown = null;

  // INCOME
  if (type === 'INCOME_SPLIT' || type === 'INCOME_DIRECT') {
    await supabase.from('wallet_ledger').insert([{ transaction_id: txId, wallet_id, amount }]);
    
    if (is_direct) {
       await supabase.from('allocation_ledger').insert([{ transaction_id: txId, allocation_id, amount }]);
    } else {
       // Split
       const { data: allocs } = await supabase.from('allocations').select('*');
       if (!allocs) throw new Error('No allocations found');
       
       let sum = 0;
       const ledgers = [];
       let fundsId = null;
       
       for (const a of allocs) {
         if (a.name === 'Funds') fundsId = a.id;
         if (Number(a.target_percentage) > 0) {
            const cut = Math.floor(amount * (Number(a.target_percentage) / 100));
            sum += cut;
            if (cut > 0) {
              ledgers.push({ transaction_id: txId, allocation_id: a.id, amount: cut });
            }
         }
       }
       
       const remainder = amount - sum;
       if (remainder > 0 && fundsId) {
          const fundsEntry = ledgers.find(l => l.allocation_id === fundsId);
          if (fundsEntry) fundsEntry.amount += remainder;
          else ledgers.push({ transaction_id: txId, allocation_id: fundsId, amount: remainder });
       }
       
       if (ledgers.length > 0) {
          await supabase.from('allocation_ledger').insert(ledgers);
          
          splitBreakdown = ledgers.map(l => {
             const allocName = allocs.find(a => a.id === l.allocation_id)?.name || 'Unknown';
             return { name: allocName, amount: l.amount };
          });
       }
    }
  }

  // EXPENSE
  else if (type === 'EXPENSE') {
     await supabase.from('wallet_ledger').insert([{ transaction_id: txId, wallet_id, amount: -amount }]);
     await supabase.from('allocation_ledger').insert([{ transaction_id: txId, allocation_id, amount: -amount }]);
  }

  // LEND (PAUTANG)
  else if (type === 'LEND') {
     let { data: personWallet } = await supabase.from('wallets').select('id').ilike('name', person_name).eq('group_type', 'Utang Sakin (Receivable)').single();
     
     if (!personWallet) {
       const { data: newWallet, error } = await supabase.from('wallets').insert([{ name: person_name, group_type: 'Utang Sakin (Receivable)' }]).select('id').single();
       if (error) throw new Error(error.message);
       personWallet = newWallet;
     }

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id, amount: -amount },
       { transaction_id: txId, wallet_id: personWallet.id, amount: amount }
     ]);
     
     if (lend_sources && lend_sources.length > 0) {
       let totalDeducted = 0;
       const allocLedgers = [];
       for (const source of lend_sources) {
         if (source.amount > 0) {
           allocLedgers.push({ transaction_id: txId, allocation_id: source.allocation_id, amount: -source.amount });
           totalDeducted += source.amount;
         }
       }
       
       if (totalDeducted > 0) {
          let { data: offsetAlloc } = await supabase.from('allocations').select('id').eq('name', 'Lent Money (Offset)').single();
          if (!offsetAlloc) {
             const { data: newAlloc } = await supabase.from('allocations').insert([{ name: 'Lent Money (Offset)', target_percentage: 0 }]).select('id').single();
             if (newAlloc) offsetAlloc = newAlloc;
          }
          if (offsetAlloc) {
             allocLedgers.push({ transaction_id: txId, allocation_id: offsetAlloc.id, amount: totalDeducted });
          }
       }
       
       if (allocLedgers.length > 0) {
         await supabase.from('allocation_ledger').insert(allocLedgers);
       }
     }
  }

  revalidatePath('/');
  revalidatePath('/history');
  return { success: true, splitBreakdown };
}
