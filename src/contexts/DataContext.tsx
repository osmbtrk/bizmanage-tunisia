import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { archiveDocument } from '@/lib/archiveService';
import { toast } from '@/hooks/use-toast';

import { companiesApi, clientsApi, productsApi, categoriesApi, invoicesApi, expensesApi, suppliersApi, stockMovementsApi, documentsApi, bomApi } from '@/services/api';
import { authApi } from '@/services/api';

type DbClient = Database['public']['Tables']['clients']['Row'];
type DbProduct = Database['public']['Tables']['products']['Row'];
type DbInvoice = Database['public']['Tables']['invoices']['Row'];
type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type DbExpense = Database['public']['Tables']['expenses']['Row'];
type DbSupplier = Database['public']['Tables']['suppliers']['Row'];
type DbStockMovement = Database['public']['Tables']['stock_movements']['Row'];
type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbProductCategory = Database['public']['Tables']['product_categories']['Row'];

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

  categories: DbProductCategory[];
  addCategory: (data: { name: string; parent_id?: string | null }) => Promise<DbProductCategory | null>;
  updateCategory: (id: string, data: { name?: string; parent_id?: string | null }) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;

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
    discount_amount?: number;
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
  const [categories, setCategories] = useState<DbProductCategory[]>([]);
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
      const [companyRes, clientsRes, productsRes, categoriesRes, invoicesRes, itemsRes, expensesRes, suppliersRes, movementsRes] = await Promise.all([
        companiesApi.fetchCompany(companyId),
        clientsApi.fetchClients(companyId),
        productsApi.fetchProducts(companyId),
        categoriesApi.fetchCategories(companyId),
        invoicesApi.fetchInvoices(companyId),
        invoicesApi.fetchInvoiceItems(companyId),
        expensesApi.fetchExpenses(companyId),
        suppliersApi.fetchSuppliers(companyId),
        stockMovementsApi.fetchStockMovements(companyId),
      ]);

      setCompany(companyRes.data);
      setClients(clientsRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
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

  const handleUpdateCompany = useCallback(async (data: Partial<DbCompany>) => {
    if (!companyId) return;
    const { error } = await companiesApi.updateCompany(companyId, data);
    if (error) { toast({ title: 'Erreur mise à jour entreprise', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [companyId, refresh]);

  const addClient = useCallback(async (data: Omit<DbClient, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return null;
    const { data: result, error } = await clientsApi.insertClient(companyId, data);
    if (error) { toast({ title: 'Erreur ajout client', description: error.message, variant: 'destructive' }); return null; }
    refresh();
    return result;
  }, [companyId, refresh]);

  const handleUpdateClient = useCallback(async (id: string, data: Partial<DbClient>) => {
    const { error } = await clientsApi.updateClient(id, data);
    if (error) { toast({ title: 'Erreur mise à jour client', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [refresh]);

  const handleDeleteClient = useCallback(async (id: string) => {
    const { error } = await clientsApi.archiveClient(id);
    if (error) { toast({ title: 'Erreur archivage client', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [refresh]);

  const addProduct = useCallback(async (data: Omit<DbProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return null;
    const { data: result, error } = await productsApi.insertProduct(companyId, data);
    if (error) { toast({ title: 'Erreur ajout produit', description: error.message, variant: 'destructive' }); return null; }
    refresh();
    return result;
  }, [companyId, refresh]);

  const handleUpdateProduct = useCallback(async (id: string, data: Partial<DbProduct>) => {
    const { error } = await productsApi.updateProduct(id, data);
    if (error) { toast({ title: 'Erreur mise à jour produit', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [refresh]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    const { error } = await productsApi.deleteProduct(id);
    if (error) { toast({ title: 'Erreur suppression produit', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [refresh]);

  const addCategory = useCallback(async (data: { name: string; parent_id?: string | null }) => {
    if (!companyId) return null;
    const { data: result, error } = await categoriesApi.insertCategory(companyId, data);
    if (error) { toast({ title: 'Erreur ajout catégorie', description: error.message, variant: 'destructive' }); return null; }
    refresh();
    return result;
  }, [companyId, refresh]);

  const handleUpdateCategory = useCallback(async (id: string, data: { name?: string; parent_id?: string | null }) => {
    const { error } = await categoriesApi.updateCategory(id, data);
    if (error) { toast({ title: 'Erreur mise à jour catégorie', description: error.message, variant: 'destructive' }); return; }
    refresh();
  }, [refresh]);

  const handleDeleteCategory = useCallback(async (id: string): Promise<boolean> => {
    const { count } = await productsApi.countProductsByCategory(id);
    if (count && count > 0) {
      toast({ title: 'Impossible de supprimer', description: `${count} produit(s) utilisent cette catégorie. Réassignez-les d'abord.`, variant: 'destructive' });
      return false;
    }
    const { error } = await categoriesApi.deleteCategory(id);
    if (error) { toast({ title: 'Erreur suppression catégorie', description: error.message, variant: 'destructive' }); return false; }
    refresh();
    return true;
  }, [refresh]);

  const getNextDocNumber = useCallback(async (type: DocumentType): Promise<string> => {
    if (!companyId) return '';
    const { data, error } = await documentsApi.getNextDocumentNumber(companyId, type);
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
    discount_amount?: number;
  }) => {
    if (!companyId) return;

    let number: string;
    try {
      number = await getNextDocNumber(data.type);
    } catch (err: any) {
      toast({ title: 'Erreur de numérotation', description: err?.message || 'Impossible de générer le numéro de document', variant: 'destructive' });
      return;
    }
    const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tvaTotal = data.items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
    const discount = data.discount_amount ?? 0;
    const total = Math.max(0, subtotal + tvaTotal - discount);

    const { data: invoice } = await invoicesApi.insertInvoice({
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
      discount_amount: discount,
    });

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
      await invoicesApi.insertInvoiceItems(itemsToInsert);

      // Auto-archive the document
      const { data: authData } = await authApi.getUser();
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

      // Update stock for factures/BL
      if (data.type === 'facture' || data.type === 'bon_livraison') {
        const productIds = data.items.filter(i => i.product_id).map(i => i.product_id!);
        const { data: freshProducts } = await productsApi.fetchProductsByIds(productIds);
        const freshMap = new Map((freshProducts ?? []).map(p => [p.id, p]));

        for (const item of data.items) {
          if (item.product_id) {
            const product = freshMap.get(item.product_id);
            if (product) {
              await productsApi.updateProduct(item.product_id, { stock: product.stock - item.quantity });
              freshMap.set(item.product_id, { ...product, stock: product.stock - item.quantity });

              // BOM: if finished product, deduct raw materials
              if (product.product_type === 'finished_product') {
                const { data: bomItems } = await bomApi.fetchBomItems(product.id);

                if (bomItems && bomItems.length > 0) {
                  const rawMatIds = bomItems.map(b => b.raw_material_id);
                  const { data: freshRawMats } = await productsApi.fetchProductsByIds(rawMatIds);
                  const rawMap = new Map((freshRawMats ?? []).map(p => [p.id, p]));

                  for (const bom of bomItems) {
                    const rawMat = rawMap.get(bom.raw_material_id);
                    const deductQty = bom.unit_type === 'percentage'
                      ? Math.ceil((Number(bom.quantity) / 100) * item.quantity)
                      : Number(bom.quantity) * item.quantity;

                    if (rawMat) {
                      const newStock = Math.max(0, rawMat.stock - deductQty);
                      await productsApi.updateProduct(rawMat.id, { stock: newStock });
                      rawMap.set(rawMat.id, { ...rawMat, stock: newStock });

                      await stockMovementsApi.insertStockMovement({
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
            await stockMovementsApi.insertStockMovement({
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
  }, [companyId, getNextDocNumber, refresh, company]);

  const handleUpdateInvoiceStatus = useCallback(async (id: string, status: string, paidAmount?: number) => {
    const inv = invoices.find(i => i.id === id);
    await invoicesApi.updateInvoiceStatus(
      id,
      status,
      paidAmount ?? (status === 'paid' ? inv?.total ?? 0 : inv?.paid_amount ?? 0)
    );
    refresh();
  }, [invoices, refresh]);

  const handleDeleteInvoice = useCallback(async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv && (inv.type === 'facture' || inv.type === 'bon_livraison')) {
      for (const item of inv.items) {
        if (item.product_id) {
          const { data: product } = await productsApi.fetchProductStock(item.product_id);
          if (product) {
            await productsApi.updateProduct(item.product_id, { stock: product.stock + item.quantity });
            if (companyId) {
              await stockMovementsApi.insertStockMovement({
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
    await invoicesApi.deleteInvoice(id);
    refresh();
  }, [invoices, companyId, refresh]);

  const addExpense = useCallback(async (
    data: Omit<DbExpense, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    stockItems?: { product_id: string; product_name: string; quantity: number }[]
  ) => {
    if (!companyId) return;
    await expensesApi.insertExpense(companyId, data);

    if (stockItems && stockItems.length > 0) {
      for (const si of stockItems) {
        const product = products.find(p => p.id === si.product_id);
        if (product) {
          await productsApi.updateProduct(si.product_id, { stock: product.stock + si.quantity });
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
    }

    refresh();
  }, [companyId, products, refresh]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await expensesApi.deleteExpense(id);
    refresh();
  }, [refresh]);

  const addSupplier = useCallback(async (data: Omit<DbSupplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return;
    await suppliersApi.insertSupplier(companyId, data);
    refresh();
  }, [companyId, refresh]);

  const handleDeleteSupplier = useCallback(async (id: string) => {
    await suppliersApi.deleteSupplier(id);
    refresh();
  }, [refresh]);

  return (
    <DataContext.Provider value={{
      company, updateCompany: handleUpdateCompany,
      clients: clients.filter(c => !c.is_archived), addClient, updateClient: handleUpdateClient, deleteClient: handleDeleteClient,
      products, addProduct, updateProduct: handleUpdateProduct, deleteProduct: handleDeleteProduct,
      categories, addCategory, updateCategory: handleUpdateCategory, deleteCategory: handleDeleteCategory,
      invoices, addInvoice, updateInvoiceStatus: handleUpdateInvoiceStatus, deleteInvoice: handleDeleteInvoice,
      expenses, addExpense, deleteExpense: handleDeleteExpense,
      suppliers, addSupplier, deleteSupplier: handleDeleteSupplier,
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
