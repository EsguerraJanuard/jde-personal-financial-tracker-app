import { supabase } from "@/lib/supabase";
import UtangClient from "@/components/UtangClient";

export const revalidate = 0;

export default async function UtangPage() {
  const { data: balances } = await supabase.from("wallet_balances").select("*");
  const { data: ledgers } = await supabase.from("wallet_ledger").select("wallet_id, transactions(created_at)");

  const receivables = balances?.filter(w => w.group_type === 'Utang Sakin (Receivable)' && Number(w.balance) !== 0) || [];
  const payables = balances?.filter(w => w.group_type === 'Utang Ko (Payable)' && Number(w.balance) !== 0) || [];

  // Map latest transaction date per wallet
  const dateMap: Record<string, string> = {};
  ledgers?.forEach((l: any) => {
     if (l.transactions?.created_at) {
        const current = dateMap[l.wallet_id];
        if (!current || new Date(l.transactions.created_at) > new Date(current)) {
           dateMap[l.wallet_id] = l.transactions.created_at;
        }
     }
  });

  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  const { data: allocs } = await supabase.from('allocation_balances').select('*').order('name');

  const { data: allWL } = await supabase.from('wallet_ledger').select('transaction_id, wallet_id, amount');
  const { data: allAL } = await supabase.from('allocation_ledger').select('transaction_id, allocation_id, amount');
  const { data: validTxs } = await supabase.from('transactions').select('id').in('type', ['TRANSFER']);
  const validTxIds = validTxs?.map(t => t.id) || [];

  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const visibleAllocations = allocs?.filter(a => !a.name.includes('(Offset)')) || [];
  const offsetAllocs = allocs?.filter(a => a.name.includes('(Offset)')).map(a => a.id) || [];

  const mapWithDates = (list: any[]) => list.map(w => {
     // Find envelopes this person owes or is owed, ONLY from actual lend/settle actions
     const txIds = allWL?.filter(wl => wl.wallet_id === w.id && validTxIds.includes(wl.transaction_id)).map(wl => wl.transaction_id) || [];
     const envelopeMap: Record<string, number> = {};
     
     allAL?.filter(al => txIds.includes(al.transaction_id) && !offsetAllocs.includes(al.allocation_id)).forEach(al => {
        envelopeMap[al.allocation_id] = (envelopeMap[al.allocation_id] || 0) + Number(al.amount);
     });

     // Convert map to array of destinations
     const defaultDestinations = Object.entries(envelopeMap)
       .map(([allocId, amount]) => ({
          allocation_id: allocId,
          // If receivable, amount is negative (we took from envelope). So we want to return positive.
          amount: w.group_type === 'Utang Sakin (Receivable)' ? -amount : amount
       }))
       .filter(d => d.amount > 0);

     return {
       ...w,
       last_active: dateMap[w.id] || null,
       defaultDestinations
     };
  }).sort((a, b) => {
     if (!a.last_active) return 1;
     if (!b.last_active) return -1;
     return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
  });

  return (
    <UtangClient 
      receivables={mapWithDates(receivables)} 
      payables={mapWithDates(payables)} 
      physicalWallets={physicalWallets}
      allocations={visibleAllocations}
    />
  );
}
