/**
 * Business-logic service for client operations.
 */
import type { Database } from '@/integrations/supabase/types';
import { clientsApi } from '@/services/api';

type DbClient = Database['public']['Tables']['clients']['Row'];

export async function createClient(companyId: string, data: Omit<DbClient, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return clientsApi.insertClient(companyId, data);
}

export async function updateClient(id: string, data: Partial<DbClient>) {
  return clientsApi.updateClient(id, data);
}

export async function archiveClient(id: string) {
  return clientsApi.archiveClient(id);
}

export async function fetchClients(companyId: string) {
  return clientsApi.fetchClients(companyId);
}
