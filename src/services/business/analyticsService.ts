/**
 * Business-logic service for analytics computations.
 * Pure functions that operate on in-memory data — no DB calls.
 * Reusable across web dashboard and future mobile apps.
 */
import type { Database } from '@/integrations/supabase/types';

type DbInvoice = Database['public']['Tables']['invoices']['Row'];
type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type DbExpense = Database['public']['Tables']['expenses']['Row'];

type InvoiceWithItems = DbInvoice & { items: DbInvoiceItem[] };

export interface TimeSeriesPoint {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AnalyticsTotals {
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProductSalesEntry {
  name: string;
  qty: number;
  revenue: number;
}

export interface ExpenseCategoryEntry {
  name: string;
  value: number;
}

/**
 * Compute revenue vs expenses time series (monthly or daily).
 */
export function computeTimeSeries(
  invoices: InvoiceWithItems[],
  expenses: DbExpense[],
  view: 'monthly' | 'daily'
): TimeSeriesPoint[] {
  const now = new Date();
  const factures = invoices.filter(i => i.type === 'facture');

  if (view === 'monthly') {
    const points: TimeSeriesPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear();
      const label = d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' });
      const rev = factures
        .filter(inv => { const id = new Date(inv.date); return id.getMonth() === m && id.getFullYear() === y; })
        .reduce((s, inv) => s + Number(inv.total), 0);
      const exp = expenses
        .filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; })
        .reduce((s, e) => s + Number(e.amount), 0);
      points.push({ label, revenue: rev, expenses: exp, profit: rev - exp });
    }
    return points;
  }

  const points: TimeSeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });
    const rev = factures.filter(inv => inv.date === ds).reduce((s, inv) => s + Number(inv.total), 0);
    const exp = expenses.filter(e => e.date === ds).reduce((s, e) => s + Number(e.amount), 0);
    points.push({ label, revenue: rev, expenses: exp, profit: rev - exp });
  }
  return points;
}

/**
 * Compute aggregate totals.
 */
export function computeTotals(invoices: InvoiceWithItems[], expenses: DbExpense[]): AnalyticsTotals {
  const revenue = invoices.filter(i => i.type === 'facture').reduce((s, i) => s + Number(i.total), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  return { revenue, expenses: totalExpenses, profit: revenue - totalExpenses };
}

/**
 * Rank products by sales revenue.
 */
export function computeBestSellingProducts(invoices: InvoiceWithItems[], limit = 10): ProductSalesEntry[] {
  const map: Record<string, ProductSalesEntry> = {};
  invoices.filter(i => i.type === 'facture').forEach(inv => {
    inv.items.forEach(item => {
      const key = item.product_name;
      if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0 };
      map[key].qty += item.quantity;
      map[key].revenue += Number(item.total);
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/**
 * Group expenses by category.
 */
export function computeExpensesByCategory(expenses: DbExpense[]): ExpenseCategoryEntry[] {
  const cats: Record<string, number> = {};
  expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
  return Object.entries(cats).map(([name, value]) => ({ name, value }));
}
