import { Card, CardBody, CardHeader } from '@heroui/react';
import StatusBadge from '@/components/StatusBadge';

interface RecentInvoicesProps {
  invoices: any[];
  formatDT: (n: number) => string;
  onSelect: (inv: any) => void;
}

export default function RecentInvoices({ invoices, formatDT, onSelect }: RecentInvoicesProps) {
  return (
    <Card shadow="sm" className="lg:col-span-2 bg-card border border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dernières factures
        </h3>
      </CardHeader>
      <CardBody className="px-4 pb-4">
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucune facture</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium text-xs">N°</th>
                  <th className="text-left py-2 font-medium text-xs">Client</th>
                  <th className="text-left py-2 font-medium text-xs">Date</th>
                  <th className="text-right py-2 font-medium text-xs">Total</th>
                  <th className="text-right py-2 font-medium text-xs">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-200 cursor-pointer" onClick={() => onSelect(inv)}>
                    <td className="py-2.5 font-medium">{inv.number}</td>
                    <td className="py-2.5 text-muted-foreground">{inv.client_name}</td>
                    <td className="py-2.5 text-muted-foreground">{new Date(inv.date).toLocaleDateString('fr-TN')}</td>
                    <td className="py-2.5 text-right font-semibold">{formatDT(Number(inv.total))}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
