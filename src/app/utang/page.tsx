import { supabase } from "@/lib/supabase";
import UtangClient from "@/components/UtangClient";

export const revalidate = 0;

export default async function UtangPage() {
  // Query wallet_balances view to ensure the balance property is included in the payload
  const { data: wallets } = await supabase.from('wallet_balances').select('*').order('name');
  const { data: allocs } = await supabase.from('allocation_balances').select('*').order('name');

  const OFFSET_IDS = [
    '05da18bc-f387-4be5-ad54-c6d924a15751', 
    '70736863-3ec1-4630-9487-077deda5cfe0', 
    '43f7c93e-37e6-4480-85b4-7557bb8e06fb'
  ];
  
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const visibleAllocations = allocs?.filter(a => !OFFSET_IDS.includes(a.id)) || [];

  const { data: allTxs } = await supabase
    .from('transactions')
    .select(`
      id, type, parent_transaction_id, description, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) ),
      allocation_ledger ( amount, allocation_id )
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
           // Calculate default destinations (envelopes used in original transaction)
           let defaultDestinations: any[] = [];
           if (isLend && tx.allocation_ledger) {
              defaultDestinations = tx.allocation_ledger
                .filter((al: any) => Number(al.amount) < 0 && !OFFSET_IDS.includes(al.allocation_id))
                .map((al: any) => ({
                   allocation_id: al.allocation_id,
                   amount: Math.abs(Number(al.amount)) // absolute amount originally taken
                }));
           }

           const loanRecord = {
              id: tx.id,
              person_name: personName,
              description: tx.description || (isLend ? 'Lent Money' : 'Borrowed Money'),
              date: tx.created_at,
              principal: principalAmount,
              settled: totalSettled,
              remaining: remainingBalance,
              defaultDestinations
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
