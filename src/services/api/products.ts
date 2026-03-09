import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbProduct = Database['public']['Tables']['products']['Row'];

export async function fetchProducts(companyId: string) {
  return supabase.from('products').select('*').eq('company_id', companyId).order('name');
}

export async function insertProduct(companyId: string, data: Omit<DbProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return supabase.from('products').insert({ ...data, company_id: companyId }).select().single();
}

export async function updateProduct(id: string, data: Partial<DbProduct>) {
  return supabase.from('products').update(data).eq('id', id);
}

export async function deleteProduct(id: string) {
  return supabase.from('products').delete().eq('id', id);
}

export async function fetchProductsByIds(ids: string[]) {
  return supabase.from('products').select('*').in('id', ids);
}

export async function fetchProductStock(id: string) {
  return supabase.from('products').select('stock').eq('id', id).single();
}

/** Atomic stock adjustment via DB function. Returns new stock value. Throws on negative stock. */
export async function adjustStock(productId: string, delta: number) {
  return supabase.rpc('adjust_stock', { _product_id: productId, _delta: delta });
}

/** Validate stock availability for multiple items before deduction */
export async function validateStockAvailability(items: { product_id: string; quantity: number }[]) {
  return supabase.rpc('validate_stock_availability', { _items: JSON.stringify(items) });
}

/** Find a client by exact name match (for POS Passager lookup) */
export async function fetchProductsByStock(companyId: string, productIds: string[]) {
  return supabase.from('products').select('id, stock, name').eq('company_id', companyId).in('id', productIds);
}

export async function countProductsByCategory(categoryId: string) {
  return supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
}
