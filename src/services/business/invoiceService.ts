/**
 * Business-logic service for invoice operations.
 * Orchestrates document numbering, invoice creation, stock deduction, BOM handling, and archiving.
 * Reusable across web and future mobile clients.
 */
import type { Database } from '@/integrations/supabase/types';
import { invoicesApi, productsApi, stockMovementsApi, bomApi, documentsApi, authApi } from '@/services/api';
import { archiveDocument } from '@/lib/archiveService';

type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type DbCompany = Database['public']['Tables']['companies']['Row'];
export type DocumentType = 'facture' | 'devis' | 'bon_livraison' | 'bon_commande';

export interface CreateInvoiceInput {
  companyId: string;
  company: DbCompany | null;
  type: DocumentType;
  date: string;
  due_date?: string;
  client_id: string;
  client_name: string;
  items: Omit<DbInvoiceItem, 'id' | 'invoice_id' | 'sort_order'>[];
  status: string;
  paid_amount: number;
  payment_terms?: string;
  notes?: string;
  discount_amount?: number;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Full invoice creation workflow:
 * 1. Generate next document number
 * 2. Calculate totals
 * 3. Insert invoice + items
 * 4. Archive document as PDF/HTML
 * 5. Deduct stock for facture/BL (including BOM raw materials)
 * 6. Record stock movements
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const { companyId, company, type, date, client_id, client_name, items, status, paid_amount } = input;
  const discount = input.discount_amount ?? 0;

  // 1. Document numbering
  const { data: number, error: numErr } = await documentsApi.getNextDocumentNumber(companyId, type);
  if (numErr || !number) {
    return { success: false, error: numErr?.message || 'Impossible de générer le numéro de document' };
  }

  // 2. Calculate totals
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
  const total = Math.max(0, subtotal + tvaTotal - discount);

  // 3. Insert invoice
  const { data: invoice, error: invErr } = await invoicesApi.insertInvoice({
    company_id: companyId,
    number: number as string,
    type,
    date,
    due_date: input.due_date || null,
    client_id,
    client_name,
    subtotal,
    tva_total: tvaTotal,
    total,
    status,
    paid_amount,
    payment_terms: input.payment_terms || null,
    notes: input.notes || null,
    discount_amount: discount,
  });

  if (invErr || !invoice) {
    return { success: false, error: invErr?.message || 'Erreur création facture' };
  }

  // 4. Insert invoice items
  const itemsToInsert = items.map((item, idx) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tva_rate: item.tva_rate,
    total: item.total,
    sort_order: idx,
  }));
  await invoicesApi.insertInvoiceItems(itemsToInsert);

  // 5. Archive
  const { data: authData } = await authApi.getUser();
  if (authData?.user) {
    await archiveDocument(
      {
        number: number as string,
        type,
        date,
        clientName: client_name,
        items: items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, tva_rate: i.tva_rate })),
        subtotal,
        tvaTotal,
        total,
        notes: input.notes,
        payment_terms: input.payment_terms,
        paidAmount: paid_amount,
      },
      company,
      {
        companyId,
        userId: authData.user.id,
        invoiceId: invoice.id,
        documentType: type,
        documentNumber: number as string,
        clientName: client_name,
        totalAmount: total,
      }
    );
  }

  // 6. Stock deduction for facture / bon_livraison
  if (type === 'facture' || type === 'bon_livraison') {
    await deductStockForItems(companyId, items, type, number as string);
  }

  return { success: true, invoiceId: invoice.id, invoiceNumber: number as string };
}

/**
 * Update invoice payment status.
 */
export async function updateInvoiceStatus(id: string, status: string, paidAmount: number) {
  return invoicesApi.updateInvoiceStatus(id, status, paidAmount);
}

/**
 * Delete invoice and restore stock if it was a facture/BL.
 */
export async function deleteInvoice(
  id: string,
  invoice: { type: string; number: string; items: { product_id: string | null; product_name: string; quantity: number }[] },
  companyId: string
) {
  if (invoice.type === 'facture' || invoice.type === 'bon_livraison') {
    await restoreStockForItems(companyId, invoice.items, invoice.type, invoice.number);
  }
  return invoicesApi.deleteInvoice(id);
}

// ── Internal helpers ──

async function deductStockForItems(
  companyId: string,
  items: Omit<DbInvoiceItem, 'id' | 'invoice_id' | 'sort_order'>[],
  docType: string,
  docNumber: string
) {
  const label = docType === 'facture' ? 'Facture' : 'BL';

  for (const item of items) {
    if (!item.product_id) continue;

    // Deduct finished product stock
    const { error: stockErr } = await productsApi.adjustStock(item.product_id, -item.quantity);
    if (stockErr) console.error('Stock adjustment error:', stockErr);

    // BOM: deduct raw materials
    const { data: bomItems } = await bomApi.fetchBomItems(item.product_id);
    if (bomItems && bomItems.length > 0) {
      for (const bom of bomItems) {
        const deductQty = bom.unit_type === 'percentage'
          ? Math.ceil((Number(bom.quantity) / 100) * item.quantity)
          : Number(bom.quantity) * item.quantity;

        const { error: rawErr } = await productsApi.adjustStock(bom.raw_material_id, -deductQty);
        if (rawErr) console.error('BOM stock adjustment error:', rawErr);

        const { data: rawProducts } = await productsApi.fetchProductsByIds([bom.raw_material_id]);
        await stockMovementsApi.insertStockMovement({
          company_id: companyId,
          product_id: bom.raw_material_id,
          product_name: rawProducts?.[0]?.name || 'Matière première',
          type: 'out',
          quantity: deductQty,
          reason: `BOM - ${item.product_name} (${label} ${docNumber})`,
        });
      }
    }

    await stockMovementsApi.insertStockMovement({
      company_id: companyId,
      product_id: item.product_id,
      product_name: item.product_name,
      type: 'out',
      quantity: item.quantity,
      reason: `${label} ${docNumber}`,
    });
  }
}

async function restoreStockForItems(
  companyId: string,
  items: { product_id: string | null; product_name: string; quantity: number }[],
  docType: string,
  docNumber: string
) {
  const label = docType === 'facture' ? 'Facture' : 'BL';

  for (const item of items) {
    if (!item.product_id) continue;

    const { error: stockErr } = await productsApi.adjustStock(item.product_id, item.quantity);
    if (!stockErr) {
      await stockMovementsApi.insertStockMovement({
        company_id: companyId,
        product_id: item.product_id,
        product_name: item.product_name,
        type: 'in',
        quantity: item.quantity,
        reason: `Annulation ${label} ${docNumber}`,
      });
    }

    // BOM reversal
    const { data: bomItems } = await bomApi.fetchBomItems(item.product_id);
    if (bomItems && bomItems.length > 0) {
      for (const bom of bomItems) {
        const restoreQty = bom.unit_type === 'percentage'
          ? Math.ceil((Number(bom.quantity) / 100) * item.quantity)
          : Number(bom.quantity) * item.quantity;

        const { error: bomErr } = await productsApi.adjustStock(bom.raw_material_id, restoreQty);
        if (!bomErr) {
          const { data: rawProducts } = await productsApi.fetchProductsByIds([bom.raw_material_id]);
          await stockMovementsApi.insertStockMovement({
            company_id: companyId,
            product_id: bom.raw_material_id,
            product_name: rawProducts?.[0]?.name || 'Matière première',
            type: 'in',
            quantity: restoreQty,
            reason: `Annulation BOM - ${item.product_name} (${label} ${docNumber})`,
          });
        }
      }
    }
  }
}
