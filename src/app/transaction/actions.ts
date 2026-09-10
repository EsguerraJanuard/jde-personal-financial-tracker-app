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

     if (allocation_id) {
       await supabase.from('allocation_ledger').insert([
         { transaction_id: txId, allocation_id: allocation_id, amount: amount }
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
