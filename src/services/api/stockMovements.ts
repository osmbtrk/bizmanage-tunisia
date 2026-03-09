import { supabase } from '@/integrations/supabase/client';

export async function fetchStockMovements(companyId: string) {
  return supabase.from('stock_movements').select('*').eq('company_id', companyId).order('date', { ascending: false });
}

export async function insertStockMovement(data: {
  company_id: string;
  product_id: string;
  product_name: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
}) {
  return supabase.from('stock_movements').insert(data);
}
