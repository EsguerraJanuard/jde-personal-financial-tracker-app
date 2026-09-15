'use server';

import { supabase } from '@/lib/supabase';

export async function fetchHistoryTransactions(monthFilter: string) {
  let query = supabase
    .from('transactions')
    .select(`
      id, type, description, created_at,
      wallet_ledger ( amount, wallets ( name, group_type ) ),
      allocation_ledger ( amount, allocations ( name ) )
    `)
    .neq('description', 'Initial System Seeding')
    .order('created_at', { ascending: false });

  if (monthFilter) {
    const [year, month] = monthFilter.split('-');
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999); 
    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
