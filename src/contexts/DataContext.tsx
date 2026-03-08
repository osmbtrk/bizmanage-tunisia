import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { archiveDocument } from '@/lib/archiveService';

type DbClient = Database['public']['Tables']['clients']['Row'];
type DbProduct = Database['public']['Tables']['products']['Row'];
type DbInvoice = Database['public']['Tables']['invoices']['Row'];
type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type DbExpense = Database['public']['Tables']['expenses']['Row'];
type DbSupplier = Database['public']['Tables']['suppliers']['Row'];
type DbStockMovement = Database['public']['Tables']['stock_movements']['Row'];
type DbCompany = Database['public']['Tables']['companies']['Row'];

export type DocumentType = 'facture' | 'devis' | 'bon_livraison' | 'bon_commande';

interface DataContextType {
  company: DbCompany | null;
  updateCompany: (data: Partial<DbCompany>) => Promise<void>;

  clients: DbClient[];
  addClient: (data: Omit<DbClient, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => Promise<DbClient | null>;
  updateClient: (id: string, data: Partial<DbClient>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  products: DbProduct[];
  addProduct: (data: Omit<DbProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => Promise<DbProduct | null>;
  updateProduct: (id: string, data: Partial<DbProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  invoices: (DbInvoice & { items: DbInvoiceItem[] })[];
  addInvoice: (data: {
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
  }) => Promise<void>;
  updateInvoiceStatus: (id: string, status: string, paidAmount?: number) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  expenses: DbExpense[];
  addExpense: (data: Omit<DbExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>, stockItems?: { product_id: string; product_name: string; quantity: number }[]) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  suppliers: DbSupplier[];
  addSupplier: (data: Omit<DbSupplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  stockMovements: DbStockMovement[];
  loading: boolean;
  refresh: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { companyId } = useAuth();
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [clients, setClients] = useState<DbClient[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [invoices, setInvoices] = useState<(DbInvoice & { items: DbInvoiceItem[] })[]>([]);
  const [expenses, setExpenses] = useState<DbExpense[]>([]);
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [stockMovements, setStockMovements] = useState<DbStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const [companyRes, clientsRes, productsRes, invoicesRes, itemsRes, expensesRes, suppliersRes, movementsRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('clients').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('company_id', companyId).order('name'),
        supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('invoice_items').select('*, invoices!inner(company_id)').eq('invoices.company_id', companyId),
        supabase.from('expenses').select('*').eq('company_id', companyId).order('date', { ascending: false }),
        supabase.from('suppliers').select('*').eq('company_id', companyId).order('name'),
        supabase.from('stock_movements').select('*').eq('company_id', companyId).order('date', { ascending: false }),
      ]);

      setCompany(companyRes.data);
      setClients(clientsRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setExpenses(expensesRes.data ?? []);
      setSuppliers(suppliersRes.data ?? []);
      setStockMovements(movementsRes.data ?? []);

      // Merge invoice items
      const allItems = itemsRes.data ?? [];
      const invoicesWithItems = (invoicesRes.data ?? []).map(inv => ({
        ...inv,
        items: allItems.filter(it => it.invoice_id === inv.id),
      }));
      setInvoices(invoicesWithItems);
      setLoading(false);
    };

    load();
  }, [companyId, refreshKey]);

  const updateCompany = useCallback(async (data: Partial<DbCompany>) => {
    if (!companyId) return;
    await supabase.from('companies').update(data).eq('id', companyId);
    refresh();
  }, [companyId, refresh]);

  const addClient = useCallback(async (data: Omit<DbClient, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return null;
    const { data: result } = await supabase.from('clients').insert({ ...data, company_id: companyId }).select().single();
    refresh();
    return result;
  }, [companyId, refresh]);

  const updateClient = useCallback(async (id: string, data: Partial<DbClient>) => {
    await supabase.from('clients').update(data).eq('id', id);
    refresh();
  }, [refresh]);

  const deleteClient = useCallback(async (id: string) => {
    await supabase.from('clients').update({ is_archived: true }).eq('id', id);
    refresh();
  }, [refresh]);

  const addProduct = useCallback(async (data: Omit<DbProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return null;
    const { data: result } = await supabase.from('products').insert({ ...data, company_id: companyId }).select().single();
    refresh();
    return result;
  }, [companyId, refresh]);

  const updateProduct = useCallback(async (id: string, data: Partial<DbProduct>) => {
    await supabase.from('products').update(data).eq('id', id);
    refresh();
  }, [refresh]);

  const deleteProduct = useCallback(async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    refresh();
  }, [refresh]);

  const getNextDocNumber = useCallback(async (type: DocumentType): Promise<string> => {
    if (!companyId) return '';
    const { data, error } = await supabase.rpc('next_document_number', {
      _company_id: companyId,
      _doc_type: type,
    });
    if (error) throw error;
    return data as string;
  }, [companyId]);

  const addInvoice = useCallback(async (data: {
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
  }) => {
    if (!companyId) return;

    const number = await getNextDocNumber(data.type);
    const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tvaTotal = data.items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
    const total = subtotal + tvaTotal;

    const { data: invoice } = await supabase.from('invoices').insert({
      company_id: companyId,
      number,
      type: data.type,
      date: data.date,
      due_date: data.due_date || null,
      client_id: data.client_id,
      client_name: data.client_name,
      subtotal,
      tva_total: tvaTotal,
      total,
      status: data.status,
      paid_amount: data.paid_amount,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
    }).select().single();

    if (invoice) {
      const itemsToInsert = data.items.map((item, idx) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate,
        total: item.total,
        sort_order: idx,
      }));
      await supabase.from('invoice_items').insert(itemsToInsert);

      // Auto-archive the document
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && companyId) {
        archiveDocument(
          {
            number,
            type: data.type,
            date: data.date,
            clientName: data.client_name,
            items: data.items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, tva_rate: i.tva_rate })),
            subtotal,
            tvaTotal,
            total,
            notes: data.notes,
            payment_terms: data.payment_terms,
            paidAmount: data.paid_amount,
          },
          company,
          {
            companyId,
            userId: authData.user.id,
            invoiceId: invoice.id,
            documentType: data.type,
            documentNumber: number,
            clientName: data.client_name,
            totalAmount: total,
          }
        );
      }

      // Update stock for factures/BL — fetch fresh product data to avoid stale state
      if (data.type === 'facture' || data.type === 'bon_livraison') {
        const productIds = data.items.filter(i => i.product_id).map(i => i.product_id!);
        const { data: freshProducts } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);
        const freshMap = new Map((freshProducts ?? []).map(p => [p.id, p]));

        for (const item of data.items) {
          if (item.product_id) {
            const product = freshMap.get(item.product_id);
            if (product) {
              await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.product_id);
              // Update map for subsequent items referencing same product
              freshMap.set(item.product_id, { ...product, stock: product.stock - item.quantity });

              // BOM: if finished product, deduct raw materials
              if (product.product_type === 'finished_product') {
                const { data: bomItems } = await supabase
                  .from('bom_items')
                  .select('*')
                  .eq('finished_product_id', product.id);

                if (bomItems && bomItems.length > 0) {
                  // Fetch fresh raw material data
                  const rawMatIds = bomItems.map(b => b.raw_material_id);
                  const { data: freshRawMats } = await supabase
                    .from('products')
                    .select('*')
                    .in('id', rawMatIds);
                  const rawMap = new Map((freshRawMats ?? []).map(p => [p.id, p]));

                  for (const bom of bomItems) {
                    const rawMat = rawMap.get(bom.raw_material_id);
                    const deductQty = bom.unit_type === 'percentage'
                      ? Math.ceil((bom.quantity / 100) * item.quantity)
                      : bom.quantity * item.quantity;

                    if (rawMat) {
                      const newStock = Math.max(0, rawMat.stock - deductQty);
                      await supabase.from('products').update({ stock: newStock }).eq('id', rawMat.id);
                      rawMap.set(rawMat.id, { ...rawMat, stock: newStock });

                      await supabase.from('stock_movements').insert({
                        company_id: companyId,
                        product_id: rawMat.id,
                        product_name: rawMat.name,
                        type: 'out',
                        quantity: deductQty,
                        reason: `BOM - ${product.name} (${data.type === 'facture' ? 'Facture' : 'BL'} ${number})`,
                      });
                    }
                  }
                }
              }
            }
            await supabase.from('stock_movements').insert({
              company_id: companyId,
              product_id: item.product_id,
              product_name: item.product_name,
              type: 'out',
              quantity: item.quantity,
              reason: `${data.type === 'facture' ? 'Facture' : 'BL'} ${number}`,
            });
          }
        }
      }
    }
    refresh();
  }, [companyId, getNextDocNumber, products, refresh]);

  const updateInvoiceStatus = useCallback(async (id: string, status: string, paidAmount?: number) => {
    const inv = invoices.find(i => i.id === id);
    await supabase.from('invoices').update({
      status,
      paid_amount: paidAmount ?? (status === 'paid' ? inv?.total ?? 0 : inv?.paid_amount ?? 0),
    }).eq('id', id);
    refresh();
  }, [invoices, refresh]);

  const deleteInvoice = useCallback(async (id: string) => {
    // Restore stock before deleting
    const inv = invoices.find(i => i.id === id);
    if (inv && (inv.type === 'facture' || inv.type === 'bon_livraison')) {
      for (const item of inv.items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.product_id);
            if (companyId) {
              await supabase.from('stock_movements').insert({
                company_id: companyId,
                product_id: item.product_id,
                product_name: item.product_name,
                type: 'in',
                quantity: item.quantity,
                reason: `Annulation ${inv.type === 'facture' ? 'Facture' : 'BL'} ${inv.number}`,
              });
            }
          }
        }
      }
    }
    await supabase.from('invoices').delete().eq('id', id);
    refresh();
  }, [invoices, companyId, refresh]);

  const addExpense = useCallback(async (
    data: Omit<DbExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    stockItems?: { product_id: string; product_name: string; quantity: number }[]
  ) => {
    if (!companyId) return;
    await supabase.from('expenses').insert({ ...data, company_id: companyId });

    // Auto-increase raw material stock when supplier expense has linked products
    if (stockItems && stockItems.length > 0) {
      for (const si of stockItems) {
        const product = products.find(p => p.id === si.product_id);
        if (product) {
          await supabase.from('products').update({
            stock: product.stock + si.quantity,
          }).eq('id', si.product_id);

          await supabase.from('stock_movements').insert({
            company_id: companyId,
            product_id: si.product_id,
            product_name: si.product_name,
            type: 'in',
            quantity: si.quantity,
            reason: `Achat fournisseur - ${data.description}`,
          });
        }
      }
    }

    refresh();
  }, [companyId, products, refresh]);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    refresh();
  }, [refresh]);

  const addSupplier = useCallback(async (data: Omit<DbSupplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return;
    await supabase.from('suppliers').insert({ ...data, company_id: companyId });
    refresh();
  }, [companyId, refresh]);

  const deleteSupplier = useCallback(async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    refresh();
  }, [refresh]);

  return (
    <DataContext.Provider value={{
      company, updateCompany,
      clients: clients.filter(c => !c.is_archived), addClient, updateClient, deleteClient,
      products, addProduct, updateProduct, deleteProduct,
      invoices, addInvoice, updateInvoiceStatus, deleteInvoice,
      expenses, addExpense, deleteExpense,
      suppliers, addSupplier, deleteSupplier,
      stockMovements, loading, refresh,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
