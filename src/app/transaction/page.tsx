import { supabase } from "@/lib/supabase";
import TransactionForm from "@/components/TransactionForm";

export const revalidate = 0;

export default async function TransactionPage() {
  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  const { data: allocations } = await supabase.from('allocation_balances').select('*').order('name');
  
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  
  const OFFSET_IDS = [
    '05da18bc-f387-4be5-ad54-c6d924a15751', 
    '70736863-3ec1-4630-9487-077deda5cfe0', 
    '43f7c93e-37e6-4480-85b4-7557bb8e06fb'
  ];
  
  const visibleAllocations = allocations?.filter(a => !OFFSET_IDS.includes(a.id)) || [];
  
  return (
    <main className="flex-1 w-full max-w-md mx-auto min-h-screen flex flex-col bg-black">
      <TransactionForm 
        wallets={physicalWallets} 
        allocations={visibleAllocations} 
      />
    </main>
  );
}
