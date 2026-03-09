import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbSupplier = Database['public']['Tables']['suppliers']['Row'];

export async function fetchSuppliers(companyId: string) {
  return supabase.from('suppliers').select('*').eq('company_id', companyId).order('name');
}

export async function insertSupplier(companyId: string, data: Omit<DbSupplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return supabase.from('suppliers').insert({ ...data, company_id: companyId });
}

export async function deleteSupplier(id: string) {
  return supabase.from('suppliers').delete().eq('id', id);
}
