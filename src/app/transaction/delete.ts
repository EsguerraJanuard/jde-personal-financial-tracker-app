'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(transactionId: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw new Error(error.message);
  
  revalidatePath('/');
  revalidatePath('/history');
}
