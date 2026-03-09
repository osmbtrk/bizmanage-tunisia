import { archivesApi } from '@/services/api';
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
    const { error: uploadError } = await archivesApi.uploadArchiveFile(filePath, blob);

    if (uploadError) {
      console.error('Archive upload error:', uploadError);
      return;
    }

    // Get signed URL (bucket is private)
    const { data: urlData, error: urlError } = await archivesApi.getArchiveAccessUrl(filePath);
    if (urlError || !urlData?.signedUrl) {
      console.error('Archive signed URL error:', urlError);
      return;
    }

    // Insert archive record — store the file path, not the signed URL (signed URLs expire)
    await archivesApi.insertArchive({
      company_id: meta.companyId,
      document_type: meta.documentType,
      document_number: meta.documentNumber,
      client_name: meta.clientName,
      total_amount: meta.totalAmount,
      pdf_file_url: filePath,
      created_by_user: meta.userId,
      invoice_id: meta.invoiceId,
    });
  } catch (err) {
    console.error('Archive error:', err);
  }
}
