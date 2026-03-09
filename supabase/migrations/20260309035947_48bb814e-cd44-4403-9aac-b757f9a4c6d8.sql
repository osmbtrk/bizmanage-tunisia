
-- 1. Add CHECK constraints for document type and stock movement type
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_type 
  CHECK (type IN ('facture', 'devis', 'bon_livraison', 'bon_commande'));

ALTER TABLE public.stock_movements ADD CONSTRAINT chk_stock_movements_type 
  CHECK (type IN ('in', 'out', 'adjustment'));

-- 2. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoices_company_type ON public.invoices (company_id, type);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON public.invoices (company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON public.invoices (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_date ON public.stock_movements (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients (company_id, name);
CREATE INDEX IF NOT EXISTS idx_products_company_category ON public.products (company_id, category_id);
CREATE INDEX IF NOT EXISTS idx_products_company_type ON public.products (company_id, product_type);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON public.expenses (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company_date ON public.purchase_invoices (company_id, date DESC);

-- 3. Add partial unique index for Passager client (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_passager_unique 
  ON public.clients (company_id) WHERE name = 'Passager' AND is_archived = false;

-- 4. Add NOT NULL constraint to invoices.type (already has values, safe)
ALTER TABLE public.invoices ALTER COLUMN type SET NOT NULL;
