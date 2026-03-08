import { buildInvoiceHtml, type PdfInvoiceData, type PdfCompanyData } from './generatePdfHtml';

export function generateInvoicePdf(invoice: PdfInvoiceData, company?: PdfCompanyData | null) {
  const html = buildInvoiceHtml(invoice, company);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
