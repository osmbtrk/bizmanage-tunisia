import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type {
  Client, Product, Invoice, Expense, Supplier,
  StockMovement, DocumentCounter, DocumentType, InvoiceItem
} from '@/types';

interface DataContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'subtotal' | 'tvaTotal' | 'total'>) => Invoice;
  updateInvoiceStatus: (id: string, status: Invoice['status'], paidAmount?: number) => void;
  deleteInvoice: (id: string) => void;

  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  deleteExpense: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  deleteSupplier: (id: string) => void;

  stockMovements: StockMovement[];

  getNextDocNumber: (type: DocumentType) => string;
}

const DataContext = createContext<DataContextType | null>(null);

function generateId() {
  return crypto.randomUUID();
}

function calcInvoiceTotals(items: InvoiceItem[]) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.tvaRate) / 100, 0);
  return { subtotal, tvaTotal, total: subtotal + tvaTotal };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useLocalStorage<Client[]>('bm_clients', []);
  const [products, setProducts] = useLocalStorage<Product[]>('bm_products', []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('bm_invoices', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('bm_expenses', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('bm_suppliers', []);
  const [stockMovements, setStockMovements] = useLocalStorage<StockMovement[]>('bm_stock_movements', []);
  const [counters, setCounters] = useLocalStorage<DocumentCounter>('bm_counters', {
    facture: 0, devis: 0, bon_livraison: 0, bon_commande: 0,
  });

  const getNextDocNumber = useCallback((type: DocumentType) => {
    const year = new Date().getFullYear();
    const prefixes: Record<DocumentType, string> = {
      facture: 'FAC', devis: 'DEV', bon_livraison: 'BL', bon_commande: 'BC',
    };
    const next = counters[type] + 1;
    setCounters(c => ({ ...c, [type]: next }));
    return `${prefixes[type]}-${year}-${String(next).padStart(4, '0')}`;
  }, [counters, setCounters]);

  const addClient = useCallback((data: Omit<Client, 'id' | 'createdAt'>) => {
    const client: Client = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setClients(prev => [...prev, client]);
    return client;
  }, [setClients]);

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, [setClients]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  }, [setClients]);

  const addProduct = useCallback((data: Omit<Product, 'id' | 'createdAt'>) => {
    const product: Product = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setProducts(prev => [...prev, product]);
    return product;
  }, [setProducts]);

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, [setProducts]);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, [setProducts]);

  const addInvoice = useCallback((data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'subtotal' | 'tvaTotal' | 'total'>) => {
    const totals = calcInvoiceTotals(data.items);
    const number = getNextDocNumber(data.type);
    const invoice: Invoice = {
      ...data, ...totals, id: generateId(), number, createdAt: new Date().toISOString(),
    };
    setInvoices(prev => [...prev, invoice]);
    // Update stock for factures and bon de livraison
    if (data.type === 'facture' || data.type === 'bon_livraison') {
      data.items.forEach(item => {
        setProducts(prev => prev.map(p =>
          p.id === item.productId ? { ...p, stock: p.stock - item.quantity } : p
        ));
        setStockMovements(prev => [...prev, {
          id: generateId(), productId: item.productId, productName: item.productName,
          type: 'out', quantity: item.quantity, date: new Date().toISOString(),
          reason: `${data.type === 'facture' ? 'Facture' : 'Bon de livraison'} ${number}`,
        }]);
      });
    }
    return invoice;
  }, [setInvoices, getNextDocNumber, setProducts, setStockMovements]);

  const updateInvoiceStatus = useCallback((id: string, status: Invoice['status'], paidAmount?: number) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === id ? { ...inv, status, paidAmount: paidAmount ?? (status === 'paid' ? inv.total : inv.paidAmount) } : inv
    ));
  }, [setInvoices]);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, [setInvoices]);

  const addExpense = useCallback((data: Omit<Expense, 'id' | 'createdAt'>) => {
    const expense: Expense = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setExpenses(prev => [...prev, expense]);
    return expense;
  }, [setExpenses]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [setExpenses]);

  const addSupplier = useCallback((data: Omit<Supplier, 'id' | 'createdAt'>) => {
    const supplier: Supplier = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setSuppliers(prev => [...prev, supplier]);
    return supplier;
  }, [setSuppliers]);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, [setSuppliers]);

  return (
    <DataContext.Provider value={{
      clients, addClient, updateClient, deleteClient,
      products, addProduct, updateProduct, deleteProduct,
      invoices, addInvoice, updateInvoiceStatus, deleteInvoice,
      expenses, addExpense, deleteExpense,
      suppliers, addSupplier, deleteSupplier,
      stockMovements,
      getNextDocNumber,
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
