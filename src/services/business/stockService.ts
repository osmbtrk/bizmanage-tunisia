/**
 * Business-logic service for stock operations.
 */
import { productsApi, stockMovementsApi } from '@/services/api';

export interface StockAdjustmentInput {
  companyId: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
}

/**
 * Adjust stock atomically and record a movement.
 */
export async function adjustStockWithMovement(input: StockAdjustmentInput): Promise<{ success: boolean; newStock?: number; error?: string }> {
  const { companyId, productId, productName, delta, reason } = input;
  const { data, error } = await productsApi.adjustStock(productId, delta);
  if (error) return { success: false, error: error.message };

  await stockMovementsApi.insertStockMovement({
    company_id: companyId,
    product_id: productId,
    product_name: productName,
    type: delta > 0 ? 'in' : 'out',
    quantity: Math.abs(delta),
    reason,
  });

  return { success: true, newStock: data as number };
}
