'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function processTransaction(payload: any) {
  const { type, amount, wallet_id, allocation_id, person_name, lend_sources, expense_sources, description, is_direct, parent_transaction_id } = payload;
  
  let dbType = type;
  if (['LEND', 'BORROW', 'TRANSFER', 'SETTLE_DEBT', 'DEBT_COLLECTION'].includes(type)) dbType = 'TRANSFER';
  if (type === 'INCOME_DIRECT') dbType = 'MANUAL_ADJUSTMENT';
  if (type === 'INCOME_SPLIT') dbType = 'INCOME_SPLIT';

  const insertPayload: any = { type: dbType, description };
  if (parent_transaction_id) insertPayload.parent_transaction_id = parent_transaction_id;

  // Race Condition Mitigation (Without RPC):
  // Perform a strict server-side check of the origin wallet balance just before insertion
  if (['EXPENSE', 'TRANSFER', 'LEND', 'SETTLE_DEBT'].includes(type) && wallet_id) {
    const { data: wBal } = await supabase.from('wallet_balances').select('balance').eq('id', wallet_id).single();
    if (wBal && Number(wBal.balance) < Number(amount)) {
      throw new Error(`Insufficient funds. Your wallet balance is ₱${wBal.balance}`);
    }
  }

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert([insertPayload])
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
       const { data: allocs } = await supabase.from('allocations').select('*');
       if (!allocs) throw new Error('No allocations found');
       
       // Algorithmic Distribution Refactoring: Largest Remainder Method (Hare Quota)
       const amountInCents = Math.round(amount * 100);
       let allocatedCents = 0;
       
       const cuts = allocs
         .filter(a => Number(a.target_percentage) > 0)
         .map(a => {
           const exactCents = amountInCents * (Number(a.target_percentage) / 100);
           const floorCents = Math.floor(exactCents);
           const remainder = exactCents - floorCents;
           allocatedCents += floorCents;
           return { id: a.id, cents: floorCents, remainder };
         });
         
       // Sort by largest remainder descending
       cuts.sort((a, b) => b.remainder - a.remainder);
       
       // Distribute the remaining centavos to those with the largest remainders
       let remainingCentsToDistribute = amountInCents - allocatedCents;
       for (let i = 0; i < remainingCentsToDistribute; i++) {
         if (cuts[i]) cuts[i].cents += 1;
       }
       
       const ledgers = cuts
         .filter(c => c.cents > 0)
         .map(c => ({
           transaction_id: txId,
           allocation_id: c.id,
           amount: Number((c.cents / 100).toFixed(2))
         }));
          await supabase.from('allocation_ledger').insert(ledgers);
          
          splitBreakdown = ledgers.map(l => {
             const allocName = allocs.find(a => a.id === l.allocation_id)?.name || 'Unknown';
             return { name: allocName, amount: l.amount };
          });
       }
    }

  // EXPENSE (multi-envelope)
  else if (type === 'EXPENSE') {
     await supabase.from('wallet_ledger').insert([{ transaction_id: txId, wallet_id, amount: -amount }]);
     
     if (expense_sources && expense_sources.length > 0) {
        const allocLedgers = [];
        for (const source of expense_sources) {
           if (source.amount > 0) {
              allocLedgers.push({ transaction_id: txId, allocation_id: source.allocation_id, amount: -source.amount });
           }
        }
        if (allocLedgers.length > 0) {
           await supabase.from('allocation_ledger').insert(allocLedgers);
        }
     }
  }

  // LEND (Isolated Lifecycle)
  else if (type === 'LEND') {
     // Strict lookup: Only searches the Receivable category
     let { data: personWallet } = await supabase.from('wallets').select('id').eq('name', person_name.trim()).eq('group_type', 'Utang Sakin (Receivable)').maybeSingle();
     
     if (!personWallet) {
       const { data: newWallet, error } = await supabase.from('wallets').insert([{ name: person_name.trim(), group_type: 'Utang Sakin (Receivable)' }]).select('id').single();
       if (error) throw new Error(error.message);
       personWallet = newWallet;
     }

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id, amount: -amount },
       { transaction_id: txId, wallet_id: personWallet.id, amount: amount }
     ]);
     
     if (lend_sources && lend_sources.length > 0) {
       const allocLedgers = [];
       for (const source of lend_sources) {
         if (source.amount > 0) {
           allocLedgers.push({ transaction_id: txId, allocation_id: source.allocation_id, amount: -source.amount });
         }
       }
       if (allocLedgers.length > 0) {
         await supabase.from('allocation_ledger').insert(allocLedgers);
       }
     }
  }

  // BORROW (Isolated Lifecycle)
  else if (type === 'BORROW') {
     // Strict lookup: Only searches the Payable category
     let { data: personWallet } = await supabase.from('wallets').select('id').eq('name', person_name.trim()).eq('group_type', 'Utang Ko (Payable)').maybeSingle();
     
     if (!personWallet) {
       const { data: newWallet, error } = await supabase.from('wallets').insert([{ name: person_name.trim(), group_type: 'Utang Ko (Payable)' }]).select('id').single();
       if (error) throw new Error(error.message);
       personWallet = newWallet;
     }

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWallet.id, amount: -amount },
       { transaction_id: txId, wallet_id, amount: amount } 
     ]);

     if (allocation_id) {
        await supabase.from('allocation_ledger').insert([
          { transaction_id: txId, allocation_id: allocation_id, amount: amount }
        ]);
     }
  }

  // EXPLICIT DEBT COLLECTION (Receiving payback)
  else if (type === 'DEBT_COLLECTION') {
     let { data: personWallet } = await supabase.from('wallets').select('id').eq('name', person_name.trim()).eq('group_type', 'Utang Sakin (Receivable)').single();
     if (!personWallet) throw new Error('Receivable wallet not found for settlement.');

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWallet.id, amount: -amount },
       { transaction_id: txId, wallet_id, amount: amount }
     ]);

     if (payload.destinations && payload.destinations.length > 0) {
       const allocLedgers = [];
       // The offset is credited back
       allocLedgers.push({ transaction_id: txId, allocation_id: '05da18bc-f387-4be5-ad54-c6d924a15751', amount: -amount });
       
       for (const dest of payload.destinations) {
         if (Number(dest.amount) > 0) {
           allocLedgers.push({ transaction_id: txId, allocation_id: dest.allocation_id, amount: Number(dest.amount) });
         }
       }
       await supabase.from('allocation_ledger').insert(allocLedgers);
     } else if (allocation_id) {
       // Legacy single-envelope fallback
       await supabase.from('allocation_ledger').insert([
         { transaction_id: txId, allocation_id: allocation_id, amount: amount },
         { transaction_id: txId, allocation_id: '05da18bc-f387-4be5-ad54-c6d924a15751', amount: -amount }
       ]);
     }
  }

  // EXPLICIT SETTLE DEBT (Paying off a loan)
  else if (type === 'SETTLE_DEBT') {
     let { data: personWallet } = await supabase.from('wallets').select('id').eq('name', person_name.trim()).eq('group_type', 'Utang Ko (Payable)').single();
     if (!personWallet) throw new Error('Payable wallet not found for settlement.');

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWallet.id, amount: amount },
       { transaction_id: txId, wallet_id, amount: -amount }
     ]);

     if (allocation_id) {
       await supabase.from('allocation_ledger').insert([
         { transaction_id: txId, allocation_id: allocation_id, amount: -amount }
       ]);
     }
  }

  // INTERNAL TRANSFER
  else if (type === 'TRANSFER') {
     const { transfer_type, from_id, to_id } = payload;
     if (transfer_type === 'WALLET') {
        await supabase.from('wallet_ledger').insert([
          { transaction_id: txId, wallet_id: from_id, amount: -amount },
          { transaction_id: txId, wallet_id: to_id, amount: amount }
        ]);
     } else if (transfer_type === 'ENVELOPE') {
        await supabase.from('allocation_ledger').insert([
          { transaction_id: txId, allocation_id: from_id, amount: -amount },
          { transaction_id: txId, allocation_id: to_id, amount: amount }
        ]);
     }
  }

  revalidatePath('/');
  revalidatePath('/history');
  revalidatePath('/utang');
  return { success: true, splitBreakdown };
}
