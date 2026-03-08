
-- 1. Create product_categories table
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Add category_id to products
ALTER TABLE public.products ADD COLUMN category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users see company categories"
ON public.product_categories FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users insert company categories"
ON public.product_categories FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users update company categories"
ON public.product_categories FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users delete company categories"
ON public.product_categories FOR DELETE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- 5. updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
