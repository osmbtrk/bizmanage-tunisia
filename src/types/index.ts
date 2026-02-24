// Core types for the business management app

export type TVARate = 0 | 7 | 13 | 19;

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export type DocumentType = 'facture' | 'devis' | 'bon_livraison' | 'bon_commande';

export interface Company {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string; // Matricule fiscal
  logoUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  tvaRate: TVARate;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TVARate;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  type: DocumentType;
  date: string;
  dueDate?: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  tvaTotal: number;
  total: number;
  status: PaymentStatus;
  paidAmount: number;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  supplierId?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  date: string;
  reason: string;
}

export interface DocumentCounter {
  facture: number;
  devis: number;
  bon_livraison: number;
  bon_commande: number;
}
