/**
 * Business-logic service for product operations.
 */
import type { Database } from '@/integrations/supabase/types';
import { productsApi, categoriesApi } from '@/services/api';

type DbProduct = Database['public']['Tables']['products']['Row'];

export async function createProduct(companyId: string, data: Omit<DbProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
  return productsApi.insertProduct(companyId, data);
}

export async function updateProduct(id: string, data: Partial<DbProduct>) {
  return productsApi.updateProduct(id, data);
}

export async function deleteProduct(id: string) {
  return productsApi.deleteProduct(id);
}

export async function adjustStock(productId: string, delta: number) {
  return productsApi.adjustStock(productId, delta);
}

export async function validateStockAvailability(items: { product_id: string; quantity: number }[]) {
  return productsApi.validateStockAvailability(items);
}

/**
 * Delete a category only if no products reference it.
 */
export async function deleteCategorySafe(categoryId: string): Promise<{ success: boolean; error?: string }> {
  const { count } = await productsApi.countProductsByCategory(categoryId);
  if (count && count > 0) {
    return { success: false, error: `${count} produit(s) utilisent cette catégorie. Réassignez-les d'abord.` };
  }
  const { error } = await categoriesApi.deleteCategory(categoryId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
