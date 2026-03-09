# Fatourty — Technical Documentation

> **Version:** 1.0 — March 2026  
> **Purpose:** Allow any developer or AI assistant to fully understand, maintain, and extend this project without prior context.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Business Logic](#5-business-logic)
6. [API Layer](#6-api-layer)
7. [Security](#7-security)
8. [Known Limitations](#8-known-limitations)
9. [Future Improvements](#9-future-improvements)

---

## 1. Project Overview

**Fatourty** is a private internal business management SaaS for Tunisian small and medium businesses. It is **not** a public-facing product — it is used by company owners and employees to manage daily operations.

### Core Modules

| Module | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/` | KPIs, recent invoices, top clients, revenue charts |
| **POS (Point de Vente)** | `/pos` | Quick retail checkout with product grid, quantity selection, "Passager" default client |
| **Invoices (Factures)** | `/factures` | Create/manage sales invoices with auto-numbering, TVA, stock deduction |
| **Quotes (Devis)** | `/devis` | Same form as invoices but type=`devis`, no stock impact |
| **Payments** | `/paiements` | View payment status derived from invoices |
| **Clients** | `/clients` | Client CRUD with Tunisian fiscal fields (Matricule Fiscal, Code TVA, RNE) |
| **Products** | `/produits` | Product CRUD with types: `finished_product`, `raw_material`, `service` |
| **Categories** | `/categories` | Hierarchical product categories with parent/child support |
| **Stock** | `/stock` | Stock overview, valuation, low-stock alerts |
| **Stock Movements** | `/mouvements` | History of all stock in/out movements with filtering |
| **Suppliers** | `/fournisseurs` | Supplier CRUD |
| **Purchase Invoices** | `/factures-fournisseurs` | Supplier invoice management with stock-in on creation |
| **Expenses** | `/depenses` | Expense tracking with TVA, recurring expenses, supplier linking |
| **Taxes** | `/taxes` | TVA summary and tax reporting |
| **Archives** | `/archives` | Auto-generated HTML archives of all documents, stored in private bucket |
| **Analytics** | `/analytiques` | Revenue, expense, and profit charts (Recharts) |
| **Settings** | `/parametres` | Company info, logo, fiscal details |
| **Auth** | `/auth` | Email/password signup & login |

### Tunisian Compliance

- TVA rates: 0%, 7%, 13%, 19%
- Currency: TND (3 decimal places)
- Required fields: Matricule Fiscal, Code TVA, RNE
- Legal forms: `personne_physique`, `suarl`, `sarl`, `sa`, `sas`, `snc`, `autre`
- Document numbering: `FAC-2026-0001`, `DEV-2026-0001`, etc. — chronological, non-editable

---

## 2. Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library (Radix primitives) |
| **next-themes** | Light/dark/system theme switching |
| **React Router v6** | Client-side routing |
| **TanStack Query** | (Available, currently DataContext manages fetching) |
| **React Hook Form + Zod** | Form handling & validation |
| **Recharts** | Data visualization |
| **Lucide React** | Icon set |
| **date-fns** | Date formatting |
| **framer-motion** | (Not yet installed, recommended for animations) |
| **file-saver / jszip** | File downloads |

### Backend (Lovable Cloud / Supabase)

| Component | Purpose |
|-----------|---------|
| **PostgreSQL** | Database |
| **Supabase Auth** | Email/password authentication |
| **Row-Level Security (RLS)** | Multi-tenant data isolation |
| **Database Functions (PL/pgSQL)** | `adjust_stock`, `next_document_number`, `validate_stock_availability`, `has_role`, `get_user_company_id` |
| **Supabase Storage** | Private `archives` bucket for HTML document archives |
| **Edge Functions** | Available for server-side logic (not heavily used yet) |

### State Management

- **AuthContext** (`src/contexts/AuthContext.tsx`): User session, profile, role, company ID, inactivity timeout (30 min)
- **DataContext** (`src/contexts/DataContext.tsx`): All business data (clients, products, invoices, etc.) loaded in parallel on mount, with a `refresh()` mechanism for re-fetching after mutations

---

## 3. Folder Structure

```
src/
├── App.tsx                    # Root: providers, routing
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + design tokens (CSS variables)
│
├── contexts/
│   ├── AuthContext.tsx         # Auth state, session, role, inactivity logout
│   └── DataContext.tsx         # All business data + mutation functions
│
├── pages/                     # One file per route
│   ├── Dashboard.tsx
│   ├── PosPage.tsx
│   ├── InvoicesPage.tsx        # Reused for factures & devis (docType prop)
│   ├── ClientsPage.tsx
│   ├── ProductsPage.tsx
│   ├── CategoriesPage.tsx
│   ├── StockPage.tsx
│   ├── StockMovementsPage.tsx
│   ├── SuppliersPage.tsx
│   ├── PurchaseInvoicesPage.tsx
│   ├── ExpensesPage.tsx
│   ├── TaxesPage.tsx
│   ├── ArchivePage.tsx
│   ├── AnalyticsPage.tsx
│   ├── PaymentsPage.tsx
│   ├── SettingsPage.tsx
│   └── AuthPage.tsx
│
├── components/
│   ├── AppLayout.tsx           # Sidebar navigation + header + outlet
│   ├── ConfirmDialog.tsx       # Reusable confirmation modal
│   ├── GlobalCreateDialogs.tsx # Quick-create modals (client, product) from sidebar
│   ├── NavLink.tsx             # Active-state nav link
│   ├── StatusBadge.tsx         # Invoice status pills
│   ├── ThemeToggle.tsx         # Light/dark mode switch
│   ├── dashboard/              # Dashboard-specific widgets (KpiCard, RecentInvoices, TopClients)
│   ├── invoices/               # InvoiceForm component
│   ├── pos/                    # CheckoutDialog for POS
│   └── ui/                    # shadcn/ui primitives (DO NOT edit directly)
│
├── services/api/               # Supabase query layer (one file per domain)
│   ├── index.ts                # Re-exports all API modules
│   ├── auth.ts                 # signUp, signIn, signOut, fetchProfile, fetchUserRole
│   ├── companies.ts            # fetchCompany, updateCompany
│   ├── clients.ts              # fetchClients, insertClient, updateClient, archiveClient
│   ├── products.ts             # fetchProducts, insertProduct, adjustStock, validateStockAvailability
│   ├── categories.ts           # fetchCategories, insertCategory, updateCategory, deleteCategory
│   ├── invoices.ts             # fetchInvoices, insertInvoice, insertInvoiceItems, updateInvoiceStatus
│   ├── purchaseInvoices.ts     # CRUD for supplier invoices + items
│   ├── expenses.ts             # fetchExpenses, insertExpense, deleteExpense
│   ├── suppliers.ts            # fetchSuppliers, insertSupplier, deleteSupplier
│   ├── stockMovements.ts       # fetchStockMovements, insertStockMovement
│   ├── bom.ts                  # fetchBomItems (Bill of Materials)
│   ├── archives.ts             # upload, insert, signed URL generation
│   └── documents.ts            # getNextDocumentNumber (RPC call)
│
├── hooks/
│   ├── use-mobile.tsx          # Mobile breakpoint detection
│   ├── use-toast.ts            # Toast notification hook
│   └── useLocalStorage.ts      # Persistent local state
│
├── lib/
│   ├── utils.ts                # cn() class merge utility
│   ├── archiveService.ts       # Orchestrates HTML generation → storage upload → DB insert
│   ├── generatePdf.ts          # PDF generation utilities
│   ├── generatePdfHtml.ts      # HTML template for sales documents
│   └── generatePurchasePdfHtml.ts # HTML template for purchase documents
│
├── types/
│   └── index.ts                # Shared TypeScript interfaces
│
└── integrations/supabase/
    ├── client.ts               # Auto-generated Supabase client (DO NOT EDIT)
    └── types.ts                # Auto-generated DB types (DO NOT EDIT)
```

### Auto-generated files (NEVER edit)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`

---

## 4. Database Schema

### Tables

#### `companies`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| name | text | No | — | |
| matricule_fiscal | text | Yes | — | Tunisian tax ID |
| code_tva | text | Yes | — | |
| rne | text | Yes | — | National business registry |
| legal_form | enum (`legal_form`) | Yes | `sarl` | |
| address, email, phone, website, governorate | text | Yes | — | |
| logo_url | text | Yes | — | |
| payment_terms | text | Yes | `Paiement à 30 jours` | |
| created_at, updated_at | timestamptz | No | now() | |

#### `profiles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | References `auth.users` (no FK constraint) |
| company_id | uuid | Yes | — | FK → `companies.id` |
| full_name | text | Yes | — | |
| email | text | Yes | — | |
| created_at, updated_at | timestamptz | No | now() | |

#### `user_roles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | References `auth.users` |
| role | enum (`app_role`) | No | `employee` | Values: `admin`, `employee` |

**Unique constraint:** `(user_id, role)`

#### `clients`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| name | text | No | — | |
| status | enum (`client_status`) | No | `active` | Values: `active`, `inactive` |
| is_archived | boolean | No | false | Soft delete |
| legal_form | enum (`legal_form`) | Yes | `personne_physique` | |
| matricule_fiscal, code_tva, rne | text | Yes | — | |
| contact_person, email, phone, address, governorate | text | Yes | — | |
| payment_terms | text | Yes | `Paiement à 30 jours` | |
| created_at, updated_at | timestamptz | No | now() | |

**Partial unique index:** Only one non-archived "Passager" client per company.

#### `products`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| name | text | No | — | |
| product_type | enum (`product_type`) | No | `finished_product` | `finished_product`, `raw_material`, `service` |
| category_type | enum (`category_type`) | No | `normal` | `normal`, `matiere_premiere` |
| category_id | uuid | Yes | — | FK → `product_categories.id` |
| supplier_id | uuid | Yes | — | FK → `suppliers.id` |
| purchase_price | numeric | No | 0 | |
| selling_price | numeric | No | 0 | |
| stock | integer | No | 0 | Enforced ≥ 0 by trigger |
| min_stock | integer | No | 5 | Low-stock alert threshold |
| tva_rate | integer | No | 19 | Percentage (0, 7, 13, 19) |
| unit | text | No | `pièce` | |
| description | text | Yes | `''` | |
| created_at, updated_at | timestamptz | No | now() | |

#### `product_categories`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| name | text | No | — | |
| parent_id | uuid | Yes | — | FK → `product_categories.id` (self-referencing hierarchy) |
| created_at, updated_at | timestamptz | No | now() | |

#### `invoices`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| number | text | No | — | Auto-generated (e.g., `FAC-2026-0001`) |
| type | text | No | — | CHECK: `facture`, `devis`, `bon_livraison`, `bon_commande` |
| date | date | No | CURRENT_DATE | |
| due_date | date | Yes | — | |
| client_id | uuid | Yes | — | FK → `clients.id` |
| client_name | text | No | — | Denormalized for archive safety |
| subtotal | numeric | No | 0 | |
| tva_total | numeric | No | 0 | |
| discount_amount | numeric | No | 0 | |
| total | numeric | No | 0 | `subtotal + tva_total - discount` |
| status | text | No | `unpaid` | `unpaid`, `partial`, `paid` |
| paid_amount | numeric | No | 0 | |
| payment_terms, notes | text | Yes | — | |
| created_at, updated_at | timestamptz | No | now() | |

#### `invoice_items`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| invoice_id | uuid | No | — | FK → `invoices.id` |
| product_id | uuid | Yes | — | FK → `products.id` |
| product_name | text | No | — | Denormalized |
| quantity | integer | No | 1 | |
| unit_price | numeric | No | 0 | |
| tva_rate | integer | No | 19 | |
| total | numeric | No | 0 | `quantity × unit_price` |
| sort_order | integer | No | 0 | |

#### `purchase_invoices`
Same structure as `invoices` but with `supplier_id` / `supplier_name` instead of `client_id` / `client_name`. No CHECK constraint on type.

#### `purchase_invoice_items`
Same structure as `invoice_items` with FK to `purchase_invoices.id`.

#### `expenses`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| description | text | No | — | |
| amount_ht | numeric | No | 0 | Amount before tax |
| tva_rate | integer | No | 19 | |
| tva_amount | numeric | No | 0 | |
| amount | numeric | No | 0 | Total (HT + TVA) |
| category | text | No | `Autre` | |
| date | date | No | CURRENT_DATE | |
| supplier_id | uuid | Yes | — | FK → `suppliers.id` |
| is_recurring | boolean | No | false | |
| recurrence_period | text | Yes | — | |
| created_at, updated_at | timestamptz | No | now() | |

#### `suppliers`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| name | text | No | — | |
| email, phone, address, tax_id | text | Yes | — | |
| created_at, updated_at | timestamptz | No | now() | |

#### `stock_movements`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| product_id | uuid | Yes | — | FK → `products.id` |
| product_name | text | No | — | |
| type | text | No | — | CHECK: `in`, `out`, `adjustment` |
| quantity | integer | No | — | |
| reason | text | Yes | — | |
| date | timestamptz | No | now() | |

#### `bom_items` (Bill of Materials)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| finished_product_id | uuid | No | — | FK → `products.id` |
| raw_material_id | uuid | No | — | FK → `products.id` |
| quantity | numeric | No | 1 | Fixed amount or percentage |
| unit_type | text | No | `fixed` | `fixed` or `percentage` |
| created_at | timestamptz | No | now() | |

#### `archives`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| invoice_id | uuid | Yes | — | FK → `invoices.id` |
| document_type | text | No | — | |
| document_number | text | No | — | |
| client_name | text | No | — | |
| total_amount | numeric | No | 0 | |
| pdf_file_url | text | Yes | — | File path in storage (not a public URL) |
| created_by_user | uuid | No | — | |
| created_at | timestamptz | No | now() | |

#### `document_counters`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| company_id | uuid | No | — | FK → `companies.id` |
| doc_type | text | No | — | `facture`, `devis`, etc. |
| year | integer | No | EXTRACT(year) | |
| counter | integer | No | 0 | Auto-incremented per doc type per year |

**Unique constraint:** `(company_id, doc_type, year)`

### Database Functions

| Function | Purpose | Security |
|----------|---------|----------|
| `next_document_number(company_id, doc_type)` | Atomically increments counter, returns formatted number like `FAC-2026-0001` | SECURITY DEFINER |
| `adjust_stock(product_id, delta)` | Atomic stock increment/decrement with negative check | SECURITY DEFINER |
| `validate_stock_availability(items jsonb)` | Validates stock for multiple items before transaction | SECURITY DEFINER |
| `has_role(user_id, role)` | Check if user has a specific role (avoids RLS recursion) | SECURITY DEFINER |
| `get_user_company_id(user_id)` | Returns user's company_id from profiles | SECURITY DEFINER |
| `handle_new_user()` | Trigger on `auth.users` INSERT: creates company, profile, role, counters | SECURITY DEFINER |
| `check_stock_not_negative()` | Trigger on products: prevents negative stock | — |
| `update_updated_at_column()` | Generic trigger to set `updated_at = now()` | — |

---

## 5. Business Logic

### 5.1 POS Checkout Flow

1. User selects products from grid, adjusts quantities
2. Default client is **"Passager"** (singleton per company, created on demand)
3. Admin users see profit margins; employees do not
4. On checkout:
   - Calls `addInvoice()` with `type: 'facture'`
   - Document number auto-generated via `next_document_number` RPC
   - Stock deducted atomically via `adjust_stock` for each item
   - BOM raw materials also deducted if product is a `finished_product` with BOM entries
   - Stock movement records created for each deduction
   - HTML archive auto-generated and uploaded to private storage bucket
5. Payment can be full or partial → updates `status` and `paid_amount`

### 5.2 Invoice Creation Flow

1. User fills invoice form: client, items, dates, notes, discount
2. `addInvoice()` is called in `DataContext`:
   - Generates next document number via RPC
   - Calculates subtotal, TVA, total
   - Inserts invoice record
   - Inserts invoice items with `sort_order`
   - **If type is `facture` or `bon_livraison`**: deducts stock + BOM materials
   - Auto-archives the document (HTML → Storage → archives table)
3. Quotes (`devis`) and purchase orders (`bon_commande`) do NOT deduct stock

### 5.3 Quote Creation

Identical to invoice creation but `type: 'devis'`. No stock impact. Can be converted to invoice later.

### 5.4 Supplier Invoice Creation

Handled by `PurchaseInvoicesPage`:
1. User selects supplier, adds items
2. Document number generated via `next_document_number` with `_doc_type = 'facture_achat'`
3. Items inserted into `purchase_invoice_items`
4. Stock **increased** for each item (raw materials in)
5. Stock movements recorded with type `in`

### 5.5 Stock Management

- **Deduction**: Automatic on `facture` / `bon_livraison` creation
- **Increase**: On supplier invoice creation or manual adjustment
- **BOM**: When a finished product is sold, its constituent raw materials are also deducted based on BOM ratios (fixed or percentage)
- **Reversal**: When an invoice is deleted, stock and BOM materials are restored
- **Negative prevention**: `check_stock_not_negative` trigger + `adjust_stock` function both enforce `stock >= 0`
- **Validation**: `validate_stock_availability` checks all items before transaction

### 5.6 Document Numbering

- Managed by `next_document_number` RPC function
- Format: `{PREFIX}-{YEAR}-{NNNN}` (e.g., `FAC-2026-0001`)
- Prefixes: FAC (facture), DEV (devis), BL (bon_livraison), BC (bon_commande), FA (facture_achat)
- Counter is per company, per doc_type, per year
- Atomic upsert prevents race conditions

### 5.7 Archive Generation

1. After invoice creation, `archiveDocument()` is called
2. Generates HTML from invoice data + company info using `buildInvoiceHtml()`
3. Uploads HTML blob to private `archives` storage bucket at path `{companyId}/{docType}/{docNumber}.html`
4. Inserts record in `archives` table with file path reference
5. Archives are accessed via signed URLs (expire after 1 hour by default)

### 5.8 Category System

- Hierarchical: categories can have `parent_id` pointing to another category
- Deletion blocked if products are assigned to the category
- Products filtered by category on Products and Stock pages

### 5.9 Invoice Deletion

When deleting a `facture` or `bon_livraison`:
1. For each item with `product_id`:
   - Restore finished product stock via `adjust_stock(+quantity)`
   - Record `in` stock movement with reason "Annulation..."
   - Fetch BOM items and restore raw material stocks too
   - Record BOM restoration movements
2. Delete the invoice record (cascade deletes items)

---

## 6. API Layer

All database queries are centralized in `src/services/api/`. Each file handles one domain:

```typescript
// Usage pattern
import { clientsApi, productsApi } from '@/services/api';

// Fetch
const { data, error } = await clientsApi.fetchClients(companyId);

// Insert
const { data: newClient, error } = await clientsApi.insertClient(companyId, clientData);

// RPC call
const { data: number } = await documentsApi.getNextDocumentNumber(companyId, 'facture');
```

### API Module Summary

| Module | Key Functions |
|--------|--------------|
| `auth.ts` | `signUp`, `signIn`, `signOut`, `getSession`, `fetchProfile`, `fetchUserRole`, `onAuthStateChange` |
| `companies.ts` | `fetchCompany`, `updateCompany` |
| `clients.ts` | `fetchClients`, `insertClient`, `updateClient`, `archiveClient`, `findPassagerClient` |
| `products.ts` | `fetchProducts`, `insertProduct`, `updateProduct`, `deleteProduct`, `adjustStock`, `validateStockAvailability`, `countProductsByCategory` |
| `categories.ts` | `fetchCategories`, `insertCategory`, `updateCategory`, `deleteCategory` |
| `invoices.ts` | `fetchInvoices`, `fetchInvoiceItems`, `insertInvoice`, `insertInvoiceItems`, `updateInvoiceStatus`, `deleteInvoice` |
| `purchaseInvoices.ts` | `fetchPurchaseInvoices`, `fetchPurchaseInvoiceItems`, `insertPurchaseInvoice`, `insertPurchaseInvoiceItems`, `deletePurchaseInvoice` |
| `expenses.ts` | `fetchExpenses`, `insertExpense`, `deleteExpense` |
| `suppliers.ts` | `fetchSuppliers`, `insertSupplier`, `deleteSupplier` |
| `stockMovements.ts` | `fetchStockMovements`, `insertStockMovement` |
| `bom.ts` | `fetchBomItems` |
| `archives.ts` | `uploadArchiveFile`, `insertArchive`, `getArchiveAccessUrl`, `createArchiveSignedUrl`, `deleteArchive` |
| `documents.ts` | `getNextDocumentNumber` (RPC wrapper) |

### Data Flow

```
Page Component → useData() hook → DataContext → services/api/* → Supabase SDK → PostgreSQL
```

All mutations go through `DataContext` which calls the appropriate API function, handles errors with toast notifications, and triggers `refresh()` to re-fetch all data.

---

## 7. Security

### 7.1 Authentication

- **Method**: Email/password via Supabase Auth
- **Email confirmation**: Required (auto-confirm is OFF)
- **Session management**: Supabase JWT tokens
- **Inactivity timeout**: 30 minutes of no mouse/keyboard/scroll/touch → automatic sign out
- **New user flow**: `handle_new_user()` trigger creates: company ("Mon Entreprise"), profile, admin role, document counters

### 7.2 Row-Level Security (RLS)

**Every table** has RLS enabled. The isolation strategy is **company-based**: users can only access data belonging to their company.

**Pattern**: All policies use `get_user_company_id(auth.uid())` to determine the user's company:

```sql
-- Typical SELECT policy
CREATE POLICY "Users see company data"
ON public.some_table FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));
```

**Special cases**:
- `companies`: Only admins can UPDATE (checked via `has_role()`)
- `user_roles`: SELECT only (no INSERT/UPDATE/DELETE from client)
- `profiles`: Users can only see/update their own profile
- `bom_items` & `invoice_items`: Policies join to parent table to check company_id
- `archives`: No UPDATE policy (immutable once created)

### 7.3 Security Definer Functions

Functions like `adjust_stock`, `next_document_number`, `has_role`, `get_user_company_id` run as `SECURITY DEFINER` with `search_path = public` to avoid RLS recursion and ensure atomic operations.

### 7.4 Storage Security

- `archives` bucket is **private** (not public)
- Files accessed via **signed URLs** with configurable expiration (default: 1 hour)
- Storage RLS policies enforce company-level access

### 7.5 Role-Based Access

- Roles stored in `user_roles` table (separate from profiles — prevents privilege escalation)
- Two roles: `admin`, `employee`
- Admin-only features: company settings update, profit margin visibility in POS
- Role checked server-side via `has_role()` function in RLS policies

---

## 8. Known Limitations

### Data Loading
1. **No pagination**: All data loaded at once in `DataContext`. Supabase default limit is 1000 rows — large datasets will be silently truncated.
2. **Full refresh on every mutation**: `refresh()` re-fetches ALL tables after any single mutation (inefficient for frequent operations).

### Features
3. **No dedicated payments table**: Payments are derived from invoice `paid_amount`/`status` — no individual payment records.
4. **No multi-currency support**: Hardcoded to TND.
5. **No invoice editing**: Once created, invoices cannot be modified — only status updates and deletion.
6. **No PDF export**: Archives are HTML files, not PDF. Browser print-to-PDF is the workaround.
7. **No email sending**: Invoices/quotes cannot be emailed to clients from the app.
8. **No audit/activity log**: No tracking of who did what and when.
9. **No expense editing**: Expenses can only be created and deleted, not updated.
10. **No recurring expense automation**: `is_recurring` flag exists but no scheduler processes it.

### Technical
11. **TanStack Query underutilized**: Data fetching is managed manually in DataContext instead of leveraging React Query's caching, invalidation, and optimistic updates.
12. **No offline support**: App requires constant internet connection.
13. **No i18n**: All UI text is hardcoded in French.
14. **Client "deletion" is soft-archive**: `deleteClient` sets `is_archived = true`, but client data persists.

---

## 9. Future Improvements

### High Priority
1. **Dedicated payments table**: Track individual payments with method (cash, card, virement, chèque), date, and notes per invoice.
2. **Paginated data loading**: Implement cursor/offset pagination in DataContext to handle >1000 records.
3. **Migrate to TanStack Query**: Replace manual state management with React Query for caching, background refresh, and optimistic updates.
4. **Invoice editing**: Allow modifying draft invoices before finalization.

### Medium Priority
5. **PDF generation**: Generate proper PDF files instead of HTML archives (use edge function + puppeteer or similar).
6. **Email integration**: Send invoices/quotes directly to clients via email.
7. **Activity/audit log**: Track all user actions with timestamps for compliance.
8. **Multi-user management**: Admin UI to invite employees, assign roles, manage team access.
9. **Recurring expense automation**: Edge function on a cron schedule to auto-create recurring expenses.
10. **Dashboard customization**: Configurable date ranges, KPI selection.

### Scaling
11. **Multi-company support**: Allow users to belong to multiple companies.
12. **API rate limiting**: Protect edge functions from abuse.
13. **Data export**: CSV/Excel export for all tables.
14. **Mobile app**: React Native or PWA for on-the-go access.
15. **Barcode/QR scanning**: For POS product lookup and inventory management.
16. **Bank reconciliation**: Match payments with bank statements.
17. **Custom report builder**: Allow users to create custom financial reports.

---

## Appendix: Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Auto-configured | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Auto-configured | Anon key for client SDK |
| `VITE_SUPABASE_PROJECT_ID` | Auto-configured | Project identifier |

**Edge function secrets** (configured in Lovable Cloud):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` (for AI gateway)

---

*Generated: March 2026 — Fatourty v1.0*
