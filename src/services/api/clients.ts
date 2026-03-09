import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbClient = Database['public']['Tables']['clients']['Row'];

export async function fetchClients(companyId: string) {
  return supabase.from('clients').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function insertClient(companyId: string, data: Omit<DbClient, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return supabase.from('clients').insert({ ...data, company_id: companyId }).select().single();
}

export async function updateClient(id: string, data: Partial<DbClient>) {
  return supabase.from('clients').update(data).eq('id', id);
}

export async function archiveClient(id: string) {
  return supabase.from('clients').update({ is_archived: true }).eq('id', id);
}
