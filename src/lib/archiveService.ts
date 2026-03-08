import { supabase } from '@/integrations/supabase/client';
import { buildInvoiceHtml, type PdfInvoiceData, type PdfCompanyData } from './generatePdfHtml';

export async function archiveDocument(
  invoiceData: PdfInvoiceData,
  company: PdfCompanyData | null | undefined,
  meta: {
    companyId: string;
    userId: string;
    invoiceId: string;
    documentType: string;
    documentNumber: string;
    clientName: string;
    totalAmount: number;
  }
) {
  try {
    // Generate HTML content
    const html = buildInvoiceHtml(invoiceData, company);
    const blob = new Blob([html], { type: 'text/html' });

    // Upload to storage
    const filePath = `${meta.companyId}/${meta.documentType}/${meta.documentNumber.replace(/\//g, '-')}.html`;
    const { error: uploadError } = await supabase.storage
      .from('archives')
      .upload(filePath, blob, { upsert: true, contentType: 'text/html' });

    if (uploadError) {
      console.error('Archive upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('archives').getPublicUrl(filePath);

    // Insert archive record
    await supabase.from('archives').insert({
      company_id: meta.companyId,
      document_type: meta.documentType,
      document_number: meta.documentNumber,
      client_name: meta.clientName,
      total_amount: meta.totalAmount,
      pdf_file_url: urlData.publicUrl,
      created_by_user: meta.userId,
      invoice_id: meta.invoiceId,
    });
  } catch (err) {
    console.error('Archive error:', err);
  }
}
