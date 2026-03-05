
-- 1. Create enums for product types
CREATE TYPE public.product_type AS ENUM ('finished_product', 'raw_material', 'service');
CREATE TYPE public.category_type AS ENUM ('normal', 'matiere_premiere');

-- 2. Add new columns to products table
ALTER TABLE public.products
  ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'finished_product',
  ADD COLUMN category_type public.category_type NOT NULL DEFAULT 'normal',
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 3. Create BOM (Bill of Materials) table
CREATE TABLE public.bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit_type text NOT NULL DEFAULT 'fixed' CHECK (unit_type IN ('fixed', 'percentage')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on bom_items
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for bom_items (access via product ownership)
CREATE POLICY "Users see company bom items" ON public.bom_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = bom_items.finished_product_id
    AND products.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users insert company bom items" ON public.bom_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = bom_items.finished_product_id
    AND products.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users update company bom items" ON public.bom_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = bom_items.finished_product_id
    AND products.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users delete company bom items" ON public.bom_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = bom_items.finished_product_id
    AND products.company_id = get_user_company_id(auth.uid())
  ));

-- 6. Add TVA columns to expenses table
ALTER TABLE public.expenses
  ADD COLUMN tva_rate integer NOT NULL DEFAULT 19,
  ADD COLUMN amount_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN tva_amount numeric NOT NULL DEFAULT 0;

-- 7. Add is_recurring and recurrence fields to expenses
ALTER TABLE public.expenses
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_period text DEFAULT NULL;
