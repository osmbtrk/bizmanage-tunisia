/**
 * Centralized business-logic service layer.
 * High-level orchestration functions that combine multiple API calls.
 *
 * Usage:
 *   import { invoiceService, posService, analyticsService } from '@/services/business';
 */

export * as invoiceService from './invoiceService';
export * as posService from './posService';
export * as analyticsService from './analyticsService';
export * as expenseService from './expenseService';
export * as clientService from './clientService';
export * as productService from './productService';
export * as stockService from './stockService';
