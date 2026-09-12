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
