import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbCompany = Database['public']['Tables']['companies']['Row'];

export async function fetchCompany(companyId: string) {
  return supabase.from('companies').select('*').eq('id', companyId).single();
}

export async function updateCompany(companyId: string, data: Partial<DbCompany>) {
  return supabase.from('companies').update(data).eq('id', companyId);
}
