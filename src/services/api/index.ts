/**
 * Centralized API service layer.
 * All Supabase queries are routed through these modules.
 *
 * Usage:
 *   import { clientsApi, productsApi } from '@/services/api';
 *   const { data } = await clientsApi.fetchClients(companyId);
 */

export * as authApi from './auth';
export * as companiesApi from './companies';
export * as clientsApi from './clients';
export * as productsApi from './products';
export * as categoriesApi from './categories';
export * as invoicesApi from './invoices';
export * as expensesApi from './expenses';
export * as suppliersApi from './suppliers';
export * as stockMovementsApi from './stockMovements';
export * as bomApi from './bom';
export * as archivesApi from './archives';
export * as purchaseInvoicesApi from './purchaseInvoices';
export * as documentsApi from './documents';
export * as returnsApi from './returns';
export * as employeesApi from './employees';
