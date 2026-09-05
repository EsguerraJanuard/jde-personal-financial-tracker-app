'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveSettings(payload: { updates: any[], newEnvelopes: any[], pinnedWalletIds: string[] }) {
  const { updates, newEnvelopes, pinnedWalletIds } = payload;
  
  // Update existing envelopes
  for (const u of updates) {
    await supabase
      .from('allocations')
      .update({ target_percentage: u.target_percentage })
      .eq('id', u.id);
  }
  
  // Insert new envelopes
  if (newEnvelopes.length > 0) {
    await supabase.from('allocations').insert(newEnvelopes.map(e => ({
      name: e.name,
      target_percentage: e.target_percentage
    })));
  }

  // Update Pinned Wallets
  if (pinnedWalletIds && pinnedWalletIds.length > 0) {
    // Reset all Frequent wallets to not pinned
    await supabase.from('wallets').update({ is_pinned: false }).eq('group_type', 'Frequent');
    // Set the selected ones to pinned
    await supabase.from('wallets').update({ is_pinned: true }).in('id', pinnedWalletIds);
  }

  revalidatePath('/');
  revalidatePath('/transaction');
  revalidatePath('/settings');
  return { success: true };
}
