import { supabase } from '@/integrations/supabase/client';

export async function fetchReturns(companyId: string) {
  return supabase.from('product_returns').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function insertReturn(data: {
  company_id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  reason: string;
  return_type: string;
  credit_note_number?: string;
  refund_amount: number;
}) {
  return supabase.from('product_returns').insert(data).select().single();
}

export async function deleteReturn(id: string) {
  return supabase.from('product_returns').delete().eq('id', id);
}
