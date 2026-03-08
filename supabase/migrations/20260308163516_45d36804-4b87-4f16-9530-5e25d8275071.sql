
-- Create archives table
CREATE TABLE public.archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_file_url TEXT,
  created_by_user UUID NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users see company archives"
  ON public.archives FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users insert company archives"
  ON public.archives FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users delete company archives"
  ON public.archives FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Storage bucket for archived PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('archives', 'archives', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users upload archives"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'archives');

-- Storage RLS: public read
CREATE POLICY "Public read archives"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'archives');

-- Storage RLS: authenticated users can delete their archives
CREATE POLICY "Authenticated users delete archives"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'archives');
