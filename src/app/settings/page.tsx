import { supabase } from "@/lib/supabase";
import SettingsClient from "@/components/SettingsClient";

export const revalidate = 0;

export default async function SettingsPage() {
  const { data: allocations } = await supabase.from('allocations').select('*').order('name');
  const { data: wallets } = await supabase.from('wallets').select('*').order('name');
  
  // Filter out system offset allocations using rigid UUIDs instead of volatile strings
  const OFFSET_IDS = [
    '05da18bc-f387-4be5-ad54-c6d924a15751', 
    '70736863-3ec1-4630-9487-077deda5cfe0', 
    '43f7c93e-37e6-4480-85b4-7557bb8e06fb'
  ];
  
  const validAllocations = allocations?.filter(a => !OFFSET_IDS.includes(a.id)) || [];
  const physicalWallets = wallets?.filter(w => w.group_type === 'Frequent') || [];

  return <SettingsClient allocations={validAllocations} wallets={physicalWallets} />;
}
