import { supabase } from "@/lib/supabase";
import SettingsClient from "@/components/SettingsClient";

export const revalidate = 0;

export default async function SettingsPage() {
  const { data: allocations } = await supabase.from('allocations').select('*').order('name');
  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  
  // Filter out system offset allocations
  const validAllocations = allocations?.filter(a => !a.name.includes('(Offset)')) || [];
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];

  return <SettingsClient allocations={validAllocations} wallets={physicalWallets} />;
}
