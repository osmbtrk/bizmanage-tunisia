/**
 * Business-logic service for POS (Point of Sale) operations.
 * Validates stock, builds the invoice payload, and delegates to invoiceService.
 */
import type { Database } from '@/integrations/supabase/types';
import { clientsApi, productsApi } from '@/services/api';
import { createInvoice, type CreateInvoiceResult } from './invoiceService';

type DbCompany = Database['public']['Tables']['companies']['Row'];

export type PaymentMethod = 'cash' | 'card' | 'virement';
export type DiscountType = 'percent' | 'fixed';

export interface PosCartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  tva_rate: number;
  stock: number;
  unit: string;
}

export interface POSCheckoutInput {
  companyId: string;
  company: DbCompany | null;
  clientId: string;
  clientName: string;
  items: PosCartItem[];
  paymentMethod: PaymentMethod;
  amountReceived: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface POSCheckoutResult extends CreateInvoiceResult {
  insufficientItems?: { product_name: string; available: number }[];
}

/**
 * Ensure a "Passager" (walk-in) client exists for the company.
 * Returns the client id.
 */
export async function ensurePassagerClient(
  companyId: string,
  addClientFn: (data: any) => Promise<any>
): Promise<string | null> {
  const { data: existing } = await clientsApi.findPassagerClient(companyId);
  if (existing && existing.length > 0) return existing[0].id;

  const result = await addClientFn({
    name: 'Passager',
    legal_form: 'personne_physique',
    matricule_fiscal: null, code_tva: null, rne: null,
    address: null, governorate: null, phone: null,
    email: null, contact_person: null, payment_terms: null,
    status: 'active', is_archived: false,
  });
  return result?.id ?? null;
}

/**
 * Full POS checkout workflow:
 * 1. Validate real-time stock from DB
 * 2. Calculate totals & discount
 * 3. Delegate to createInvoice
 */
export async function processPOSCheckout(input: POSCheckoutInput): Promise<POSCheckoutResult> {
  const { companyId, company, clientId, clientName, items, paymentMethod, amountReceived, discountType, discountValue } = input;

  if (items.length === 0) {
    return { success: false, error: 'Le panier est vide' };
  }

  // 1. Validate stock
  const productIds = items.map(i => i.product_id);
  const { data: freshProducts } = await productsApi.fetchProductsByIds(productIds);
  const freshMap = new Map((freshProducts ?? []).map(p => [p.id, p]));

  const insufficientItems = items
    .filter(i => {
      const fresh = freshMap.get(i.product_id);
      return fresh ? i.quantity > fresh.stock : false;
    })
    .map(i => ({
      product_name: i.product_name,
      available: freshMap.get(i.product_id)?.stock ?? 0,
    }));

  if (insufficientItems.length > 0) {
    return { success: false, error: 'Stock insuffisant', insufficientItems };
  }

  // 2. Calculate discount
  const subtotalHT = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
  const grossTotal = subtotalHT + tvaTotal;
  const discountAmount = discountType === 'percent'
    ? (grossTotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, grossTotal - discountAmount);

  const paidAmount = paymentMethod === 'cash' ? Math.min(amountReceived, total) : total;
  const status = paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

  const paymentLabel = paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte' : 'Virement';

  // 3. Create invoice
  return createInvoice({
    companyId,
    company,
    type: 'facture',
    date: new Date().toISOString().split('T')[0],
    client_id: clientId,
    client_name: clientName,
    items: items.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      tva_rate: i.tva_rate,
      total: i.quantity * i.unit_price,
    })),
    status,
    paid_amount: paidAmount,
    discount_amount: discountAmount,
    notes: `POS - ${paymentLabel}${discountAmount > 0 ? ` | Remise: ${discountAmount.toFixed(3)} TND` : ''}`,
  });
}

/**
 * Calculate POS cart totals (pure function, no DB calls).
 */
export function calculateCartTotals(
  items: PosCartItem[],
  discountType: DiscountType,
  discountValue: number
) {
  const subtotalHT = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
  const grossTotal = subtotalHT + tvaTotal;
  const discountAmount = discountType === 'percent'
    ? (grossTotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, grossTotal - discountAmount);
  const profitMargin = items.reduce((s, i) => s + (i.unit_price - i.purchase_price) * i.quantity, 0);

  return { subtotalHT, tvaTotal, grossTotal, discountAmount, total, profitMargin };
}
