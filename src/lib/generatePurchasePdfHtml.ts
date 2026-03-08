export interface PdfPurchaseInvoiceData {
  number: string;
  date: string;
  dueDate?: string | null;
  supplierName: string;
  items: { product_name: string; quantity: number; unit_price: number; tva_rate: number }[];
  subtotal: number;
  tvaTotal: number;
  total: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
}

export interface PdfCompanyData {
  name?: string;
  matricule_fiscal?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  code_tva?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Impayée',
  partial: 'Partiellement payée',
  paid: 'Payée',
};

export function buildPurchaseInvoiceHtml(invoice: PdfPurchaseInvoiceData, company?: PdfCompanyData | null): string {
  const formatDT = (n: number) => Number(n).toFixed(3) + ' TND';
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  const buyerHtml = company ? `
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
<title>FACTURE FOURNISSEUR ${invoice.number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2332; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #8b5e3c; padding-bottom: 20px; }
  .doc-type { font-size: 24px; font-weight: 700; color: #8b5e3c; letter-spacing: 1px; }
  .doc-number { font-size: 14px; color: #555; margin-top: 4px; }
  .doc-date { font-size: 13px; color: #555; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
  .party { background: #f5f7fa; border-radius: 8px; padding: 16px; width: 48%; }
  .party-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #8b5e3c; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e8ecf0; }
  tbody td:last-child { text-align: right; font-weight: 500; }
  .totals { margin-left: auto; width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.grand { border-top: 2px solid #8b5e3c; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 700; color: #8b5e3c; }
  .totals .row.paid { color: #16a34a; }
  .totals .row.remaining { color: #dc2626; font-weight: 600; }
  .notes { margin-top: 16px; padding: 12px; background: #fafafa; border-left: 3px solid #8b5e3c; border-radius: 0 6px 6px 0; font-size: 12px; color: #555; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 12px; color: #888; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e8ecf0; padding-top: 16px; }
  @media print { body { padding: 20px; } @page { margin: 15mm; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="doc-type">FACTURE FOURNISSEUR</div>
      <div class="doc-number">N° ${invoice.number}</div>
      <div class="doc-date">Date: ${new Date(invoice.date).toLocaleDateString('fr-TN')}</div>
      ${invoice.dueDate ? `<div class="doc-date">Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-TN')}</div>` : ''}
      <div class="doc-date">Statut: ${STATUS_LABELS[invoice.status] || invoice.status}</div>
    </div>
    ${buyerHtml}
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Fournisseur</div>
      <div style="font-size:15px;font-weight:600;">${invoice.supplierName}</div>
    </div>
    <div class="party">
      <div class="party-label">Acheteur (Notre entreprise)</div>
      <div style="font-size:15px;font-weight:600;">${company?.name || ''}</div>
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
    <div class="row paid"><span>Montant payé</span><span>${formatDT(invoice.paidAmount)}</span></div>
    ${remaining > 0 ? `<div class="row remaining"><span>Reste à payer</span><span>${formatDT(remaining)}</span></div>` : ''}
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="signature">
    <div class="signature-box">Cachet et signature du fournisseur</div>
    <div class="signature-box">Cachet et signature de l'acheteur</div>
  </div>

  <div class="footer">Document généré par Fatourty — Logiciel de facturation conforme à la législation tunisienne</div>
</body>
</html>`;
}
