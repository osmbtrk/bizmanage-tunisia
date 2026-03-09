import { supabase } from '@/integrations/supabase/client';

export async function fetchArchives(companyId: string) {
  return supabase.from('archives').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
}

export async function insertArchive(data: {
  company_id: string;
  document_type: string;
  document_number: string;
  client_name: string;
  total_amount: number;
  pdf_file_url: string;
  created_by_user: string;
  invoice_id: string | null;
}) {
  return supabase.from('archives').insert(data);
}

export async function deleteArchive(id: string) {
  return supabase.from('archives').delete().eq('id', id);
}

export async function uploadArchiveFile(filePath: string, blob: Blob) {
  return supabase.storage.from('archives').upload(filePath, blob, { upsert: true, contentType: 'text/html' });
}

/** @deprecated Use createArchiveSignedUrl instead — bucket is private */
export function getArchivePublicUrl(filePath: string) {
  return supabase.storage.from('archives').getPublicUrl(filePath);
}

/** Get a working URL for a private archive file */
export async function getArchiveAccessUrl(filePath: string, expiresIn = 3600) {
  return supabase.storage.from('archives').createSignedUrl(filePath, expiresIn);
}

export async function createArchiveSignedUrl(filePath: string, expiresIn = 300) {
  return supabase.storage.from('archives').createSignedUrl(filePath, expiresIn);
}
