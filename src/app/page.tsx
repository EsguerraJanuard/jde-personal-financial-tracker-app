import { supabase } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 0;

export default async function Home() {
  const { data: wallets } = await supabase.from("wallet_balances").select("*").order("name");
  const { data: allocations } = await supabase.from("allocation_balances").select("*").order("name");

  // Fetch recent transactions (added group_type to wallets payload for UI parsing)
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id, type, description, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) ),
      allocation_ledger ( amount, allocations ( name ) )
    `)
    .neq('description', 'Initial System Seeding')
    .order('created_at', { ascending: false })
    .limit(3);

  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  
  // DYNAMIC DEBT CLASSIFICATION
  const debtWallets = wallets?.filter(w => ['Utang Sakin (Receivable)', 'Utang Ko (Payable)'].includes(w.group_type)) || [];
  const receivables = debtWallets.filter(w => Number(w.balance) > 0);
  const payables = debtWallets.filter(w => Number(w.balance) < 0);

  const totalPhysical = physicalWallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const totalReceivables = receivables.reduce((sum, w) => sum + Number(w.balance), 0);
  const totalPayables = payables.reduce((sum, w) => sum + Number(w.balance), 0);
  
  const totalMoney = totalPhysical + totalReceivables;

  // SYSTEM OFFSET UUIDS
  const OFFSET_IDS = [
    '05da18bc-f387-4be5-ad54-c6d924a15751', // Lent Money (Offset)
    '70736863-3ec1-4630-9487-077deda5cfe0', // Borrowed Money (Offset)
    '43f7c93e-37e6-4480-85b4-7557bb8e06fb'  // Legacy Mama (Offset)
  ];

  // AGGREGATE OUTSTANDING DEFAULT DESTINATIONS FOR RECEIVABLES
  if (receivables.length > 0) {
    const recIds = receivables.map(r => r.id);
    const { data: recLedgers } = await supabase
      .from('wallet_ledger')
      .select('transaction_id, wallet_id')
      .in('wallet_id', recIds);

    if (recLedgers && recLedgers.length > 0) {
      const txIds = recLedgers.map(l => l.transaction_id);
      const { data: allocLedgers } = await supabase
        .from('allocation_ledger')
        .select('transaction_id, allocation_id, amount')
        .in('transaction_id', txIds);

      receivables.forEach((r: any) => {
        const myTxIds = recLedgers.filter(l => l.wallet_id === r.id).map(l => l.transaction_id);
        const myAllocs = allocLedgers?.filter(al => myTxIds.includes(al.transaction_id) && !OFFSET_IDS.includes(al.allocation_id)) || [];
        
        const allocSums: Record<string, number> = {};
        myAllocs.forEach(al => {
           allocSums[al.allocation_id] = (allocSums[al.allocation_id] || 0) + Number(al.amount);
        });
        
        r.defaultDestinations = Object.entries(allocSums)
          .filter(([_, sum]) => sum < -0.01) // Filter negative net balances (money lent out)
          .map(([allocId, sum]) => ({
             allocation_id: allocId,
             amount: Math.abs(sum)
          }));
      });
    }
  }

  const validAllocations = allocations?.filter(a => !OFFSET_IDS.includes(a.id)) || [];

  return (
    <DashboardClient 
      physicalWallets={physicalWallets}
      receivables={receivables}
      payables={payables}
      allocations={validAllocations}
      totalMoney={totalMoney}
      totalReceivables={totalReceivables}
      totalPayables={totalPayables}
      recentTransactions={recentTransactions || []}
    />
  );
}
