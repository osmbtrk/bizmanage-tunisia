import { supabase } from '@/integrations/supabase/client';

export async function getNextDocumentNumber(companyId: string, docType: string) {
  return supabase.rpc('next_document_number', {
    _company_id: companyId,
    _doc_type: docType,
  });
}
