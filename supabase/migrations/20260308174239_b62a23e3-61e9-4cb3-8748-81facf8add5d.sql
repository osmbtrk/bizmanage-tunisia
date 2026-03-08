
-- 1. Add discount_amount column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- 2. Make archives bucket private
UPDATE storage.buckets SET public = false WHERE id = 'archives';

-- 3. Add storage RLS policies for archives bucket
CREATE POLICY "Company users can upload archives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'archives' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);

CREATE POLICY "Company users can read archives"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'archives' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);

-- 4. Attach updated_at triggers to all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
