import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbPurchaseInvoice = Database['public']['Tables']['purchase_invoices']['Row'];
type DbPurchaseInvoiceInsert = Database['public']['Tables']['purchase_invoices']['Insert'];
type DbPurchaseInvoiceUpdate = Database['public']['Tables']['purchase_invoices']['Update'];
type DbPurchaseInvoiceItemInsert = Database['public']['Tables']['purchase_invoice_items']['Insert'];

export async function fetchPurchaseInvoices(companyId: string) {
  return supabase.from('purchase_invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function fetchPurchaseInvoiceItems(invoiceIds: string[]) {
  return supabase.from('purchase_invoice_items').select('*').in('purchase_invoice_id', invoiceIds);
}

export async function insertPurchaseInvoice(data: DbPurchaseInvoiceInsert) {
  return supabase.from('purchase_invoices').insert(data).select().single();
}

export async function updatePurchaseInvoice(id: string, data: DbPurchaseInvoiceUpdate) {
  return supabase.from('purchase_invoices').update(data).eq('id', id);
}

export async function deletePurchaseInvoice(id: string) {
  return supabase.from('purchase_invoices').delete().eq('id', id);
}

export async function insertPurchaseInvoiceItems(items: DbPurchaseInvoiceItemInsert[]) {
  return supabase.from('purchase_invoice_items').insert(items);
}

export async function deletePurchaseInvoiceItems(invoiceId: string) {
  return supabase.from('purchase_invoice_items').delete().eq('purchase_invoice_id', invoiceId);
}
