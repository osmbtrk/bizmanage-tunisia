import { useData } from '@/contexts/DataContext';
import { FileText, Users, Package, TrendingUp, AlertTriangle, DollarSign, Loader2, Receipt, Clock, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInvoicePdf } from '@/lib/generatePdf';
import KpiCard from '@/components/dashboard/KpiCard';
import TopClients from '@/components/dashboard/TopClients';
import RecentInvoices from '@/components/dashboard/RecentInvoices';
import StockStatus from '@/components/dashboard/StockStatus';
import StatusBadge from '@/components/StatusBadge';

export default function Dashboard() {
  const { invoices, clients, products, expenses, loading, company } = useData();
  const [detailInvoice, setDetailInvoice] = useState<any>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && i.type === 'facture';
    });

    const monthlyRevenue = thisMonth.reduce((s, i) => s + Number(i.total), 0);
    const monthlyTVA = thisMonth.reduce((s, i) => s + Number(i.tva_total), 0);
    const monthlyCount = thisMonth.length;

    const unpaidInvoices = invoices.filter(i => i.type === 'facture' && i.status !== 'paid');
    const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);

    const overdueInvoices = invoices.filter(i => {
      if (i.type !== 'facture' || i.status === 'paid') return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < now;
    });

    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + Number(e.amount), 0);

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthInvoices = invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear() && i.type === 'facture';
    });
    const prevMonthRevenue = prevMonthInvoices.reduce((s, i) => s + Number(i.total), 0);
    const revenueGrowth = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    return {
      monthlyRevenue, monthlyTVA, monthlyCount,
      unpaidTotal, unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      lowStockProducts, monthlyExpenses,
      revenueGrowth,
    };
  }, [invoices, products, expenses]);

  const revenueChart = useMemo(() => {
    const now = new Date();
    const months: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' });
      const rev = invoices
        .filter(inv => inv.type === 'facture' && new Date(inv.date).getMonth() === m && new Date(inv.date).getFullYear() === y)
        .reduce((s, inv) => s + Number(inv.total), 0);
      const exp = expenses
        .filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: label, revenue: rev, expenses: exp });
    }
    return months;
  }, [invoices, expenses]);

  const statusChart = useMemo(() => {
    const factures = invoices.filter(i => i.type === 'facture');
    const paid = factures.filter(i => i.status === 'paid').length;
    const unpaid = factures.filter(i => i.status === 'unpaid').length;
    const partial = factures.filter(i => i.status === 'partial').length;
    return [
      { name: 'Payées', value: paid, fill: 'hsl(var(--success))' },
      { name: 'Impayées', value: unpaid, fill: 'hsl(var(--destructive))' },
      { name: 'Partielles', value: partial, fill: 'hsl(var(--warning))' },
    ].filter(d => d.value > 0);
  }, [invoices]);

  const topClients = useMemo(() => {
    const clientRevenue: Record<string, { name: string; total: number }> = {};
    invoices.filter(i => i.type === 'facture').forEach(inv => {
      if (!clientRevenue[inv.client_name]) {
        clientRevenue[inv.client_name] = { name: inv.client_name, total: 0 };
      }
      clientRevenue[inv.client_name].total += Number(inv.total);
    });
    return Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices]);

  const recentInvoices = useMemo(() => {
    return invoices
      .filter(i => i.type === 'facture')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [invoices]);

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble du mois en cours</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={TrendingUp} label="Chiffre d'affaires TTC" value={formatDT(stats.monthlyRevenue)} trend={stats.revenueGrowth} color="text-accent" />
        <KpiCard icon={TrendingUp} label="Bénéfice net" value={formatDT(stats.monthlyRevenue - stats.monthlyExpenses)} color={stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? 'text-success' : 'text-destructive'} />
        <KpiCard icon={Receipt} label="Total TVA" value={formatDT(stats.monthlyTVA)} color="text-muted-foreground" />
        <KpiCard icon={DollarSign} label="Impayés" value={formatDT(stats.unpaidTotal)} sub={`${stats.unpaidCount} facture(s)`} color="text-destructive" />
        <KpiCard icon={FileText} label="Factures du mois" value={String(stats.monthlyCount)} color="text-primary" />
        <KpiCard icon={Clock} label="En retard" value={String(stats.overdueCount)} color={stats.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'} />
      </div>

      {/* Low Stock Warning */}
      {stats.lowStockProducts.length > 0 && (
        <div className="stock-alert-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-destructive mb-1">Alerte stock</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {stats.lowStockProducts.length} produit(s) en dessous du seuil minimum
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {stats.lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-card border border-destructive/20 px-3 py-2.5 text-sm transition-colors duration-200 hover:border-destructive/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${p.stock <= 0 ? 'bg-destructive' : 'bg-warning'}`} />
                        <span className="truncate font-medium text-foreground">{p.name}</span>
                      </div>
                      <span className={`ml-3 font-bold whitespace-nowrap tabular-nums ${p.stock <= 0 ? 'text-destructive' : 'text-warning'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Évolution des revenus (6 mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              revenue: { label: 'Revenus', color: 'hsl(var(--accent))' },
              expenses: { label: 'Dépenses', color: 'hsl(var(--destructive))' },
            }} className="h-[260px] w-full">
              <BarChart data={revenueChart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Revenus" />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Dépenses" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Statut des factures
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {statusChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">Aucune facture</p>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                        {statusChart.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2">
                  {statusChart.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TopClients clients={topClients} formatDT={formatDT} />
        <RecentInvoices invoices={recentInvoices} formatDT={formatDT} onSelect={setDetailInvoice} />
      </div>

      {/* Invoice Detail Modal */}
      <Dialog open={!!detailInvoice} onOpenChange={o => { if (!o) setDetailInvoice(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {detailInvoice.number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Client</span><p className="font-medium">{detailInvoice.client_name}</p></div>
                  <div><span className="text-muted-foreground">Date</span><p className="font-medium">{new Date(detailInvoice.date).toLocaleDateString('fr-TN')}</p></div>
                  <div><span className="text-muted-foreground">Statut</span><p><StatusBadge status={detailInvoice.status} /></p></div>
                  {detailInvoice.due_date && <div><span className="text-muted-foreground">Échéance</span><p className="font-medium">{new Date(detailInvoice.due_date).toLocaleDateString('fr-TN')}</p></div>}
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-xs">Produit</th>
                        <th className="text-right p-3 font-medium text-xs">Qté</th>
                        <th className="text-right p-3 font-medium text-xs">P.U.</th>
                        <th className="text-right p-3 font-medium text-xs">TVA</th>
                        <th className="text-right p-3 font-medium text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailInvoice.items?.map((item: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-3 font-medium">{item.product_name}</td>
                          <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                          <td className="p-3 text-right tabular-nums">{Number(item.unit_price).toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums">{item.tva_rate}%</td>
                          <td className="p-3 text-right tabular-nums font-medium">{formatDT(item.quantity * Number(item.unit_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-sm border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span className="tabular-nums">{formatDT(Number(detailInvoice.subtotal))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span className="tabular-nums">{formatDT(Number(detailInvoice.tva_total))}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2"><span>Total TTC</span><span className="tabular-nums">{formatDT(Number(detailInvoice.total))}</span></div>
                  {detailInvoice.paid_amount > 0 && detailInvoice.status !== 'paid' && (
                    <div className="flex justify-between text-muted-foreground"><span>Montant payé</span><span className="tabular-nums">{formatDT(Number(detailInvoice.paid_amount))}</span></div>
                  )}
                </div>

                {detailInvoice.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{detailInvoice.notes}</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => generateInvoicePdf({ ...detailInvoice, clientName: detailInvoice.client_name, subtotal: detailInvoice.subtotal, tvaTotal: detailInvoice.tva_total, paidAmount: detailInvoice.paid_amount }, company)}>
                  <Download className="h-4 w-4 mr-2" /> Télécharger PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
