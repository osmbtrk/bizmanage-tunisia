/**
 * Business-logic service for expense operations.
 * Handles expense creation with optional raw-material stock intake.
 */
import type { Database } from '@/integrations/supabase/types';
import { expensesApi, productsApi, stockMovementsApi } from '@/services/api';

type DbExpense = Database['public']['Tables']['expenses']['Row'];

export interface StockLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

/**
 * Record an expense and optionally increase stock for received raw materials.
 */
export async function recordExpense(
  companyId: string,
  data: Omit<DbExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
  stockItems?: StockLineItem[]
): Promise<{ success: boolean; error?: string }> {
  const { error } = await expensesApi.insertExpense(companyId, data);
  if (error) return { success: false, error: error.message };

  if (stockItems && stockItems.length > 0) {
    for (const si of stockItems) {
      await productsApi.adjustStock(si.product_id, si.quantity);
      await stockMovementsApi.insertStockMovement({
        company_id: companyId,
        product_id: si.product_id,
        product_name: si.product_name,
        type: 'in',
        quantity: si.quantity,
        reason: `Achat fournisseur - ${data.description}`,
      });
    }
  }

  return { success: true };
}

/**
 * Delete an expense by id.
 */
export async function deleteExpense(id: string) {
  return expensesApi.deleteExpense(id);
}

/**
 * Calculate TVA breakdown from a TTC amount.
 */
export function calculateTVABreakdown(amountTTC: number, tvaRate: number) {
  const amountHT = tvaRate > 0 ? amountTTC / (1 + tvaRate / 100) : amountTTC;
  const tvaAmount = amountTTC - amountHT;
  return { amountHT, tvaAmount };
}
