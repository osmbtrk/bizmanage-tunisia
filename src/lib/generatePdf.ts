import type { Invoice } from '@/types';

const DOC_LABELS: Record<string, string> = {
  facture: 'FACTURE',
  devis: 'DEVIS',
  bon_livraison: 'BON DE LIVRAISON',
  bon_commande: 'BON DE COMMANDE',
};

export function generateInvoicePdf(invoice: Invoice) {
  const formatDT = (n: number) => n.toFixed(3) + ' TND';
  const label = DOC_LABELS[invoice.type] || 'DOCUMENT';

  const html = `
<!DOCTYPE html>
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
  .client-section { background: #f5f7fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .client-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 6px; }
  .client-name { font-size: 16px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e8ecf0; }
  tbody td:last-child { text-align: right; font-weight: 500; }
  tbody tr:last-child td { border-bottom: none; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.grand { border-top: 2px solid #1e3a5f; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 700; color: #1e3a5f; }
  .notes { margin-top: 30px; padding: 12px; background: #fafafa; border-left: 3px solid #1e3a5f; border-radius: 0 6px 6px 0; font-size: 12px; color: #555; }
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
  </div>

  <div class="client-section">
    <div class="client-label">Client</div>
    <div class="client-name">${invoice.clientName}</div>
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
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>${formatDT(item.unitPrice)}</td>
        <td>${item.tvaRate}%</td>
        <td>${formatDT(item.quantity * item.unitPrice)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total HT</span><span>${formatDT(invoice.subtotal)}</span></div>
    <div class="row"><span>TVA</span><span>${formatDT(invoice.tvaTotal)}</span></div>
    <div class="row grand"><span>Total TTC</span><span>${formatDT(invoice.total)}</span></div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="footer">Document généré automatiquement — GestPro</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
