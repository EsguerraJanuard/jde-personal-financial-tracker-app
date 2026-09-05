import { supabase } from "@/lib/supabase";
import TransactionForm from "@/components/TransactionForm";

export const revalidate = 0;

export default async function TransactionPage() {
  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  const { data: allocations } = await supabase.from('allocation_balances').select('*').order('name');
  
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  const visibleAllocations = allocations?.filter(a => !a.name.includes('(Offset)')) || [];
  
  return (
    <main className="flex-1 w-full max-w-md mx-auto min-h-screen flex flex-col bg-black">
      <TransactionForm 
        wallets={physicalWallets} 
        allocations={visibleAllocations} 
      />
    </main>
  );
}
