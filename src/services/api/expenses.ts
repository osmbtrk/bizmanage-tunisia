import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbExpense = Database['public']['Tables']['expenses']['Row'];

export async function fetchExpenses(companyId: string) {
  return supabase.from('expenses').select('*').eq('company_id', companyId).order('date', { ascending: false });
}

export async function insertExpense(companyId: string, data: Omit<DbExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return supabase.from('expenses').insert({ ...data, company_id: companyId });
}

export async function deleteExpense(id: string) {
  return supabase.from('expenses').delete().eq('id', id);
}
