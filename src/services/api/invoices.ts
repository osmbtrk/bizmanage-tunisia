import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];

export async function fetchInvoices(companyId: string) {
  return supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function fetchInvoiceItems(companyId: string) {
  return supabase.from('invoice_items').select('*, invoices!inner(company_id)').eq('invoices.company_id', companyId);
}

export async function insertInvoice(data: {
  company_id: string;
  number: string;
  type: string;
  date: string;
  due_date: string | null;
  client_id: string;
  client_name: string;
  subtotal: number;
  tva_total: number;
  total: number;
  status: string;
  paid_amount: number;
  payment_terms: string | null;
  notes: string | null;
  discount_amount: number;
}) {
  return supabase.from('invoices').insert(data).select().single();
}

export async function insertInvoiceItems(items: Omit<DbInvoiceItem, 'id'>[]) {
  return supabase.from('invoice_items').insert(items);
}

export async function updateInvoiceStatus(id: string, status: string, paidAmount: number) {
  return supabase.from('invoices').update({ status, paid_amount: paidAmount }).eq('id', id);
}

export async function deleteInvoice(id: string) {
  return supabase.from('invoices').delete().eq('id', id);
}
