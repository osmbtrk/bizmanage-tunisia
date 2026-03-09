
ALTER TABLE public.document_counters DROP CONSTRAINT IF EXISTS document_counters_doc_type_check;
ALTER TABLE public.document_counters ADD CONSTRAINT document_counters_doc_type_check CHECK (doc_type IN ('facture', 'devis', 'bon_livraison', 'bon_commande', 'facture_achat'));
