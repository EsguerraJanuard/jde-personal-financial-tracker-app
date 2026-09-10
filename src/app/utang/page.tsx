import { supabase } from "@/lib/supabase";
import UtangClient from "@/components/UtangClient";

export const revalidate = 0;

export default async function UtangPage() {
  // Query wallet_balances view to ensure the balance property is included in the payload
  const { data: wallets } = await supabase.from('wallet_balances').select('*').order('name');
  const { data: allocs } = await supabase.from('allocation_balances').select('*').order('name');

  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const visibleAllocations = allocs?.filter(a => !a.name.includes('(Offset)')) || [];

  const { data: allTxs } = await supabase
    .from('transactions')
    .select(`
      id, type, parent_transaction_id, description, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) )
    `)
    .order('created_at', { ascending: false });

  const activeReceivables: any[] = [];
  const activePayables: any[] = [];

  allTxs?.forEach((tx: any) => {
     const personLedger = tx.wallet_ledger?.find((l: any) => {
       const w: any = Array.isArray(l.wallets) ? l.wallets[0] : l.wallets;
       return ['Utang Sakin (Receivable)', 'Utang Ko (Payable)'].includes(w?.group_type);
     });
     
     if (!personLedger) return;
     
     const walletInfo: any = Array.isArray(personLedger.wallets) ? personLedger.wallets[0] : personLedger.wallets;
     const personName = walletInfo?.name;
     const groupType = walletInfo?.group_type;
     const ledgerAmount = Number(personLedger.amount);

     const isLend = groupType === 'Utang Sakin (Receivable)' && ledgerAmount > 0;
     const isBorrow = groupType === 'Utang Ko (Payable)' && ledgerAmount < 0;

     if (isLend || isBorrow) {
        const principalAmount = Math.abs(ledgerAmount);
        
        const linkedSettlements = allTxs.filter((s: any) => s.parent_transaction_id === tx.id);
        
        const totalSettled = linkedSettlements.reduce((sum: number, sTx: any) => {
           const sLedger = sTx.wallet_ledger?.find((l: any) => {
             const sw: any = Array.isArray(l.wallets) ? l.wallets[0] : l.wallets;
             return sw?.name === personName;
           });
           return sum + (sLedger ? Math.abs(Number(sLedger.amount)) : 0);
        }, 0);

        const remainingBalance = principalAmount - totalSettled;

        if (remainingBalance > 0) {
           const loanRecord = {
              id: tx.id,
              person_name: personName,
              description: tx.description || (isLend ? 'Lent Money' : 'Borrowed Money'),
              date: tx.created_at,
              principal: principalAmount,
              settled: totalSettled,
              remaining: remainingBalance
           };

           if (isLend) activeReceivables.push(loanRecord);
           else if (isBorrow) activePayables.push(loanRecord);
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
