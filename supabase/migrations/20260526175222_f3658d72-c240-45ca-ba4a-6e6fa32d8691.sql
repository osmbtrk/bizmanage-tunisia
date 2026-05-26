
-- 1. Custom attribute schema (per company, optionally per category)
CREATE TABLE public.product_attribute_schemas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  category_id uuid NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_searchable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_attribute_schemas_type_check CHECK (field_type IN ('text','number','select','code')),
  CONSTRAINT product_attribute_schemas_unique UNIQUE (company_id, category_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_attribute_schemas TO authenticated;
GRANT ALL ON public.product_attribute_schemas TO service_role;

ALTER TABLE public.product_attribute_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company attribute schemas"
  ON public.product_attribute_schemas FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users insert company attribute schemas"
  ON public.product_attribute_schemas FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users update company attribute schemas"
  ON public.product_attribute_schemas FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users delete company attribute schemas"
  ON public.product_attribute_schemas FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_product_attribute_schemas_updated_at
  BEFORE UPDATE ON public.product_attribute_schemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pas_company ON public.product_attribute_schemas(company_id);
CREATE INDEX idx_pas_category ON public.product_attribute_schemas(category_id);

-- 2. Custom attribute values stored on products as jsonb { field_key: value }
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_products_custom_attributes ON public.products USING GIN (custom_attributes);
