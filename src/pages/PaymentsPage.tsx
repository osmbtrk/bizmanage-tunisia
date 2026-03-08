import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PaymentsPage() {
  const { invoices } = useData();
  const [search, setSearch] = useState('');

  const payments = useMemo(() => {
    return invoices
      .filter(inv => inv.paid_amount > 0)
      .map(inv => ({
        id: inv.id,
        invoiceNumber: inv.number,
        clientName: inv.client_name,
        paidAmount: inv.paid_amount,
        total: inv.total,
        date: inv.date,
        status: inv.paid_amount >= inv.total ? 'complet' : 'partiel',
      }))
      .filter(p =>
        p.clientName.toLowerCase().includes(search.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, search]);

  const totalPaid = payments.reduce((s, p) => s + p.paidAmount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Paiements</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total encaissé</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid.toFixed(3)} TND</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nombre de paiements</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un paiement..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun paiement trouvé</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Facture</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Montant payé</th>
                <th className="text-right p-3 font-medium">Total facture</th>
                <th className="text-center p-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{p.invoiceNumber}</td>
                  <td className="p-3">{p.clientName}</td>
                  <td className="p-3">{format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}</td>
                  <td className="p-3 text-right font-medium">{p.paidAmount.toFixed(3)} TND</td>
                  <td className="p-3 text-right">{p.total.toFixed(3)} TND</td>
                  <td className="p-3 text-center">
                    <Badge variant={p.status === 'complet' ? 'default' : 'secondary'}>
                      {p.status === 'complet' ? 'Complet' : 'Partiel'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
