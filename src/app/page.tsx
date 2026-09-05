import { supabase } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 0;

export default async function Home() {
  const { data: wallets } = await supabase.from("wallet_balances").select("*").order("name");
  const { data: allocations } = await supabase.from("allocation_balances").select("*").order("name");

  // Fetch recent transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id, type, description, created_at,
      wallet_ledger ( amount, wallets ( name ) ),
      allocation_ledger ( amount, allocations ( name ) )
    `)
    .neq('description', 'Initial System Seeding')
    .order('created_at', { ascending: false })
    .limit(3);

  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const receivables = wallets?.filter(w => w.group_type === 'Utang Sakin (Receivable)') || [];
  const payables = wallets?.filter(w => w.group_type === 'Utang Ko (Payable)') || [];

  const totalPhysical = physicalWallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const totalReceivables = receivables.reduce((sum, w) => sum + Number(w.balance), 0);
  const totalPayables = payables.reduce((sum, w) => sum + Number(w.balance), 0);
  
  const totalMoney = totalPhysical + totalReceivables;

  return (
    <DashboardClient 
      physicalWallets={physicalWallets}
      receivables={receivables}
      payables={payables}
      allocations={allocations || []}
      totalMoney={totalMoney}
      totalReceivables={totalReceivables}
      totalPayables={totalPayables}
      recentTransactions={recentTransactions || []}
    />
  );
}
