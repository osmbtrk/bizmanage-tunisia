const DOC_LABELS: Record<string, string> = {
  facture: 'FACTURE',
  devis: 'DEVIS',
  bon_livraison: 'BON DE LIVRAISON',
  bon_commande: 'BON DE COMMANDE',
};

export interface PdfInvoiceData {
  number: string;
  type: string;
  date: string;
  clientName: string;
  items: { product_name: string; quantity: number; unit_price: number; tva_rate: number }[];
  subtotal: number;
  tvaTotal: number;
  total: number;
  notes?: string | null;
  payment_terms?: string | null;
  paidAmount?: number;
}

export interface PdfCompanyData {
  name?: string;
  matricule_fiscal?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  code_tva?: string | null;
}

export function buildInvoiceHtml(invoice: PdfInvoiceData, company?: PdfCompanyData | null): string {
  const formatDT = (n: number) => Number(n).toFixed(3) + ' TND';
  const label = DOC_LABELS[invoice.type] || 'DOCUMENT';

  const sellerHtml = company ? `
    <div>
      <div style="font-size:14px;font-weight:700;">${company.name || ''}</div>
      ${company.matricule_fiscal ? `<div style="font-size:12px;color:#555;">MF: ${company.matricule_fiscal}</div>` : ''}
      ${company.code_tva ? `<div style="font-size:12px;color:#555;">Code TVA: ${company.code_tva}</div>` : ''}
      ${company.address ? `<div style="font-size:12px;color:#555;">${company.address}</div>` : ''}
      ${company.phone ? `<div style="font-size:12px;color:#555;">Tél: ${company.phone}</div>` : ''}
      ${company.email ? `<div style="font-size:12px;color:#555;">${company.email}</div>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${label} ${invoice.number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2332; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; }
  .doc-type { font-size: 28px; font-weight: 700; color: #1e3a5f; letter-spacing: 1px; }
  .doc-number { font-size: 14px; color: #555; margin-top: 4px; }
  .doc-date { font-size: 13px; color: #555; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .party { background: #f5f7fa; border-radius: 8px; padding: 16px; width: 48%; }
  .party-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e8ecf0; }
  tbody td:last-child { text-align: right; font-weight: 500; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.grand { border-top: 2px solid #1e3a5f; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 700; color: #1e3a5f; }
  .payment-terms { margin-top: 20px; padding: 10px; background: #f0f4f8; border-radius: 6px; font-size: 12px; }
  .notes { margin-top: 16px; padding: 12px; background: #fafafa; border-left: 3px solid #1e3a5f; border-radius: 0 6px 6px 0; font-size: 12px; color: #555; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 12px; color: #888; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e8ecf0; padding-top: 16px; }
  @media print { body { padding: 20px; } @page { margin: 15mm; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="doc-type">${label}</div>
      <div class="doc-number">N° ${invoice.number}</div>
      <div class="doc-date">Date: ${new Date(invoice.date).toLocaleDateString('fr-TN')}</div>
    </div>
    ${sellerHtml}
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Client</div>
      <div style="font-size:15px;font-weight:600;">${invoice.clientName}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U. HT</th>
        <th>TVA</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>${formatDT(item.unit_price)}</td>
        <td>${item.tva_rate}%</td>
        <td>${formatDT(item.quantity * item.unit_price)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total HT</span><span>${formatDT(invoice.subtotal)}</span></div>
    <div class="row"><span>TVA</span><span>${formatDT(invoice.tvaTotal)}</span></div>
    <div class="row grand"><span>Total TTC</span><span>${formatDT(invoice.total)}</span></div>
  </div>

  ${invoice.payment_terms ? `<div class="payment-terms"><strong>Conditions de paiement:</strong> ${invoice.payment_terms}</div>` : ''}
  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="signature">
    <div class="signature-box">Cachet et signature du vendeur</div>
    <div class="signature-box">Cachet et signature du client</div>
  </div>

  <div class="footer">Document généré par Fatourty — Logiciel de facturation conforme à la législation tunisienne</div>
</body>
</html>`;
}
