import { supabase } from "@/lib/supabase";
import UtangClient from "@/components/UtangClient";

export const revalidate = 0;

export default async function UtangPage() {
  // 1. Fetch physical routing destinations for the Settlement UI
  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  const { data: allocs } = await supabase.from('allocation_balances').select('*').order('name');

  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const visibleAllocations = allocs?.filter(a => !a.name.includes('(Offset)')) || [];

  // 2. Fetch all explicit loan transactions and their wallet ledgers to determine principal amounts
  const { data: parentTxs } = await supabase
    .from('transactions')
    .select(`
      id, type, description, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) )
    `)
    .in('type', ['BORROW', 'LEND'])
    .order('created_at', { ascending: false });

  // 3. Fetch all settlement transactions to calculate deductions
  const { data: settlementTxs } = await supabase
    .from('transactions')
    .select(`
      id, type, parent_transaction_id, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) )
    `)
    .not('parent_transaction_id', 'is', null);

  // 4. Map the data into specific, itemized loans
  const activeReceivables: any[] = [];
  const activePayables: any[] = [];

  parentTxs?.forEach(tx => {
     // Identify the "Person" and the "Principal Amount"
     const personLedger = tx.wallet_ledger?.find((l: any) => 
       ['Utang Sakin (Receivable)', 'Utang Ko (Payable)'].includes(l.wallets?.group_type)
     );
     
     if (!personLedger) return;
     
     const personName = personLedger.wallets.name;
     const principalAmount = Math.abs(personLedger.amount);
     
     // Find all explicit settlements linked to this specific loan
     const linkedSettlements = settlementTxs?.filter(s => s.parent_transaction_id === tx.id) || [];
     
     // Calculate total amount already settled
     const totalSettled = linkedSettlements.reduce((sum, sTx) => {
        const sLedger = sTx.wallet_ledger?.find((l: any) => l.wallets?.name === personName);
        return sum + (sLedger ? Math.abs(sLedger.amount) : 0);
     }, 0);

     const remainingBalance = principalAmount - totalSettled;

     if (remainingBalance > 0) {
        const loanRecord = {
           id: tx.id,
           person_name: personName,
           description: tx.description || (tx.type === 'LEND' ? 'Lent Money' : 'Borrowed Money'),
           date: tx.created_at,
           principal: principalAmount,
           settled: totalSettled,
           remaining: remainingBalance
        };

        if (tx.type === 'LEND') {
           activeReceivables.push(loanRecord);
        } else if (tx.type === 'BORROW') {
           activePayables.push(loanRecord);
        }
     }
  });

  return (
    <UtangClient 
      receivables={activeReceivables} 
      payables={activePayables} 
      physicalWallets={physicalWallets}
      allocations={visibleAllocations}
    />
  );
}
