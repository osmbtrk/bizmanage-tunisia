import { supabase } from '@/integrations/supabase/client';

export async function fetchCategories(companyId: string) {
  return supabase.from('product_categories').select('*').eq('company_id', companyId).order('name');
}

export async function insertCategory(companyId: string, data: { name: string; parent_id?: string | null }) {
  return supabase.from('product_categories').insert({ ...data, company_id: companyId }).select().single();
}

export async function updateCategory(id: string, data: { name?: string; parent_id?: string | null }) {
  return supabase.from('product_categories').update(data).eq('id', id);
}

export async function deleteCategory(id: string) {
  return supabase.from('product_categories').delete().eq('id', id);
}
