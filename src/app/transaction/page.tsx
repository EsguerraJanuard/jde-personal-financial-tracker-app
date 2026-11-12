import { supabase } from "@/lib/supabase";
import TransactionForm from "@/components/TransactionForm";

export const revalidate = 0;

export default async function TransactionPage() {
  const [
    { data: wallets },
    { data: allocations }
  ] = await Promise.all([
    supabase.from('wallet_balances').select('*').order('name'),
    supabase.from('allocation_balances').select('*').order('name')
  ]);
  
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];
  
  // Extract Utang Sakin (Receivable) wallets for debtor suggestions and autocomplete
  const utangSakinWallets = wallets?.filter(w => w.group_type === 'Utang Sakin (Receivable)') || [];
  
  // Active debtors (currently have unpaid balance > 0), sorted by balance descending
  const activeDebtors = utangSakinWallets
    .filter(w => Number(w.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .map(w => ({
      id: w.id,
      name: w.name.replace(/\u200B/g, '').trim(),
      balance: Number(w.balance)
    }));

  // All existing debtor contact names (including settled ones) for autocomplete
  const allContacts = Array.from(
    new Set(utangSakinWallets.map(w => w.name.replace(/\u200B/g, '').trim()))
  ).filter(Boolean);

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
        debtors={activeDebtors}
        contacts={allContacts}
      />
    </main>
  );
}
