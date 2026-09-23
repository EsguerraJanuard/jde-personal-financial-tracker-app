'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function resolvePersonWallet(person_name: string, group_type: string) {
  const cleanName = person_name.replace(/\u200B/g, '').trim().toLowerCase();
  
  // 1. Check if it already exists in the target group
  const { data: groupWallets } = await supabase.from('wallets').select('id, name').eq('group_type', group_type);
  const existing = groupWallets?.find(w => w.name.replace(/\u200B/g, '').trim().toLowerCase() === cleanName);
  if (existing) return existing.id;
  
  // 2. Need to create a new one. Ensure global uniqueness by appending \u200B
  const { data: allWallets } = await supabase.from('wallets').select('name');
  const takenNames = new Set(allWallets?.map(w => w.name) || []);
  
  let finalName = person_name.replace(/\u200B/g, '').trim();
  while (takenNames.has(finalName)) {
    finalName += '\u200B';
  }
  
  const { data: newWallet, error } = await supabase.from('wallets').insert([{ name: finalName, group_type }]).select('id').single();
  if (error) throw new Error(error.message);
  
  return newWallet.id;
}

export async function processTransaction(payload: any) {
  const { type, amount, wallet_id, allocation_id, person_name, lend_sources, expense_sources, description, is_direct, parent_transaction_id } = payload;
  
  if (amount !== undefined && Number(amount) <= 0) {
    throw new Error('Transaction amount must be strictly greater than 0');
  }

  let dbType = type;
  if (['LEND', 'BORROW', 'TRANSFER', 'SETTLE_DEBT', 'DEBT_COLLECTION'].includes(type)) dbType = 'TRANSFER';
  if (type === 'INCOME_DIRECT') dbType = 'MANUAL_ADJUSTMENT';
  if (type === 'INCOME_SPLIT') dbType = 'INCOME_SPLIT';

  const insertPayload: any = { type: dbType, description };
  if (parent_transaction_id) insertPayload.parent_transaction_id = parent_transaction_id;

  // Race Condition Mitigation (Without RPC):
  // Perform a strict server-side check of the origin balance just before insertion
  if (type === 'TRANSFER' && payload.transfer_type === 'ENVELOPE' && payload.from_id) {
    const { data: aBal } = await supabase.from('allocation_balances').select('balance').eq('id', payload.from_id).single();
    if (aBal && Number(aBal.balance) < Number(amount)) {
      throw new Error(`Insufficient funds. Envelope balance is ₱${aBal.balance}`);
    }
  } else if (['EXPENSE', 'TRANSFER', 'LEND', 'SETTLE_DEBT'].includes(type) && wallet_id) {
    // Note: TRANSFER here implies transfer_type === 'WALLET' because we already caught 'ENVELOPE' above, 
    // OR it means wallet_id is just checked generally for those types.
    if (type !== 'TRANSFER' || payload.transfer_type === 'WALLET') {
      const { data: wBal } = await supabase.from('wallet_balances').select('balance').eq('id', wallet_id).single();
      if (wBal && Number(wBal.balance) < Number(amount)) {
        throw new Error(`Insufficient funds. Your wallet balance is ₱${wBal.balance}`);
      }
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
       
       const activeAllocs = allocs.filter(a => Number(a.target_percentage) > 0);
       const totalPercentage = activeAllocs.reduce((sum, a) => sum + Number(a.target_percentage), 0);
       
       if (totalPercentage === 0) throw new Error('No active allocations found for splitting.');

       const cuts = activeAllocs
         .map(a => {
           const exactCents = amountInCents * (Number(a.target_percentage) / totalPercentage);
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
     const personWalletId = await resolvePersonWallet(person_name, 'Utang Sakin (Receivable)');

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id, amount: -amount },
       { transaction_id: txId, wallet_id: personWalletId, amount: amount }
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
     const personWalletId = await resolvePersonWallet(person_name, 'Utang Ko (Payable)');

     // STRICT STATIC LEDGER ENTRY: 
     // We completely bypass physical wallet and envelope insertions for a Borrow record.
     // It only logs the debt (Negative balance indicates we owe them).
     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWalletId, amount: -amount }
     ]);
  }

  // EXPLICIT DEBT COLLECTION (Receiving payback)
  else if (type === 'DEBT_COLLECTION') {
     const personWalletId = await resolvePersonWallet(person_name, 'Utang Sakin (Receivable)');

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWalletId, amount: -amount },
       { transaction_id: txId, wallet_id, amount: amount }
     ]);

     if (payload.destinations && payload.destinations.length > 0) {
       const allocLedgers = [];
       
       for (const dest of payload.destinations) {
         if (Number(dest.amount) > 0) {
           allocLedgers.push({ transaction_id: txId, allocation_id: dest.allocation_id, amount: Number(dest.amount) });
         }
       }
       if (allocLedgers.length > 0) {
         await supabase.from('allocation_ledger').insert(allocLedgers);
       }
     } else if (allocation_id) {
       // Legacy single-envelope fallback
       await supabase.from('allocation_ledger').insert([
         { transaction_id: txId, allocation_id: allocation_id, amount: amount }
       ]);
     }
  }

  // EXPLICIT SETTLE DEBT (Paying off a loan)
  else if (type === 'SETTLE_DEBT') {
     const personWalletId = await resolvePersonWallet(person_name, 'Utang Ko (Payable)');

     await supabase.from('wallet_ledger').insert([
       { transaction_id: txId, wallet_id: personWalletId, amount: amount },
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
