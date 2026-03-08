
-- Purchase invoices table
CREATE TABLE public.purchase_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  number text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tva_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase invoice items table
CREATE TABLE public.purchase_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate integer NOT NULL DEFAULT 19,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_invoices
CREATE POLICY "Users see company purchase invoices" ON public.purchase_invoices
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users insert company purchase invoices" ON public.purchase_invoices
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users update company purchase invoices" ON public.purchase_invoices
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users delete company purchase invoices" ON public.purchase_invoices
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- RLS policies for purchase_invoice_items (via join)
CREATE POLICY "Users see company purchase invoice items" ON public.purchase_invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_invoices WHERE purchase_invoices.id = purchase_invoice_items.purchase_invoice_id AND purchase_invoices.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users insert company purchase invoice items" ON public.purchase_invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_invoices WHERE purchase_invoices.id = purchase_invoice_items.purchase_invoice_id AND purchase_invoices.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users update company purchase invoice items" ON public.purchase_invoice_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_invoices WHERE purchase_invoices.id = purchase_invoice_items.purchase_invoice_id AND purchase_invoices.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users delete company purchase invoice items" ON public.purchase_invoice_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_invoices WHERE purchase_invoices.id = purchase_invoice_items.purchase_invoice_id AND purchase_invoices.company_id = get_user_company_id(auth.uid())));
