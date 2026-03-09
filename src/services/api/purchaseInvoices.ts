import { supabase } from '@/integrations/supabase/client';

export async function fetchPurchaseInvoices(companyId: string) {
  return supabase.from('purchase_invoices' as any).select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function fetchPurchaseInvoiceItems(invoiceIds: string[]) {
  return supabase.from('purchase_invoice_items' as any).select('*').in('purchase_invoice_id', invoiceIds);
}

export async function insertPurchaseInvoice(data: Record<string, any>) {
  return supabase.from('purchase_invoices' as any).insert(data).select().single();
}

export async function updatePurchaseInvoice(id: string, data: Record<string, any>) {
  return supabase.from('purchase_invoices' as any).update(data).eq('id', id);
}

export async function deletePurchaseInvoice(id: string) {
  return supabase.from('purchase_invoices' as any).delete().eq('id', id);
}

export async function insertPurchaseInvoiceItems(items: Record<string, any>[]) {
  return supabase.from('purchase_invoice_items' as any).insert(items);
}

export async function deletePurchaseInvoiceItems(invoiceId: string) {
  return supabase.from('purchase_invoice_items' as any).delete().eq('purchase_invoice_id', invoiceId);
}
