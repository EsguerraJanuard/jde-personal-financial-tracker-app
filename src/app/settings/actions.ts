'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveSettings({ updates, newEnvelopes, pinnedWalletIds, newWalletName }: { 
  updates: any[]; 
  newEnvelopes: any[]; 
  pinnedWalletIds: string[];
  newWalletName?: string;
}) {
  // 1. Update existing envelope percentages
  for (const env of updates) {
    const { error } = await supabase
      .from('allocations')
      .update({ target_percentage: env.target_percentage })
      .eq('id', env.id);
    if (error) throw new Error(error.message);
  }

  // 2. Insert brand new envelopes
  if (newEnvelopes && newEnvelopes.length > 0) {
    const formattedNew = newEnvelopes.map(e => ({
      name: e.name,
      target_percentage: e.target_percentage
    }));
    const { error } = await supabase.from('allocations').insert(formattedNew);
    if (error) throw new Error(error.message);
  }

  // 3. Insert new wallet if provided
  if (newWalletName && newWalletName.trim() !== '') {
    const { error } = await supabase.from('wallets').insert({
      name: newWalletName.trim(),
      group_type: 'Frequent',
      is_pinned: true
    });
    if (error) throw new Error(error.message);
  }

  // 4. Update pinned wallets status
  const { error: resetError } = await supabase.from('wallets').update({ is_pinned: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (resetError) throw new Error(resetError.message);

  if (pinnedWalletIds && pinnedWalletIds.length > 0) {
    const { error: pinError } = await supabase
      .from('wallets')
      .update({ is_pinned: true })
      .in('id', pinnedWalletIds);
    if (pinError) throw new Error(pinError.message);
  }

  revalidatePath('/');
  revalidatePath('/settings');
  return { success: true };
}
