
CREATE OR REPLACE FUNCTION public.next_document_number(_company_id uuid, _doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  _next integer;
  _prefix text;
BEGIN
  -- Atomic upsert + increment
  INSERT INTO public.document_counters (company_id, doc_type, year, counter)
  VALUES (_company_id, _doc_type, _year, 1)
  ON CONFLICT (company_id, doc_type, year)
  DO UPDATE SET counter = document_counters.counter + 1
  RETURNING counter INTO _next;

  _prefix := CASE _doc_type
    WHEN 'facture' THEN 'FAC'
    WHEN 'devis' THEN 'DEV'
    WHEN 'bon_livraison' THEN 'BL'
    WHEN 'bon_commande' THEN 'BC'
    ELSE UPPER(_doc_type)
  END;

  RETURN _prefix || '-' || _year::text || '-' || LPAD(_next::text, 4, '0');
END;
$$;

-- Add unique constraint needed for ON CONFLICT
ALTER TABLE public.document_counters ADD CONSTRAINT document_counters_company_doc_year_unique UNIQUE (company_id, doc_type, year);
