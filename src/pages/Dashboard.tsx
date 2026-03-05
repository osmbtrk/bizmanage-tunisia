import { useData } from '@/contexts/DataContext';
import { FileText, Users, Package, TrendingUp, AlertTriangle, DollarSign, Loader2, Receipt, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { invoices, clients, products, expenses, loading } = useData();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && i.type === 'facture';
    });

    const monthlyRevenue = thisMonth.reduce((s, i) => s + Number(i.total), 0);
    const monthlyHT = thisMonth.reduce((s, i) => s + Number(i.subtotal), 0);
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

    // Previous month comparison
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthInvoices = invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear() && i.type === 'facture';
    });
    const prevMonthRevenue = prevMonthInvoices.reduce((s, i) => s + Number(i.total), 0);
    const revenueGrowth = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    return {
      monthlyRevenue, monthlyHT, monthlyTVA, monthlyCount,
      unpaidTotal, unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      lowStockProducts, monthlyExpenses,
      revenueGrowth,
    };
  }, [invoices, products, expenses]);

  // Monthly revenue evolution (last 6 months)
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

  // Invoice status distribution
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

  // Top 5 clients by revenue
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

  // Recent invoices
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
        <KpiCard
          icon={TrendingUp}
          label="Chiffre d'affaires TTC"
          value={formatDT(stats.monthlyRevenue)}
          trend={stats.revenueGrowth}
          color="text-accent"
        />
        <KpiCard icon={TrendingUp} label="Bénéfice net" value={formatDT(stats.monthlyRevenue - stats.monthlyExpenses)} color={stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'} />
        <KpiCard icon={Receipt} label="Total TVA" value={formatDT(stats.monthlyTVA)} color="text-muted-foreground" />
        <KpiCard
          icon={DollarSign}
          label="Impayés"
          value={formatDT(stats.unpaidTotal)}
          sub={`${stats.unpaidCount} facture(s)`}
          color="text-destructive"
        />
        <KpiCard icon={FileText} label="Factures du mois" value={String(stats.monthlyCount)} color="text-primary" />
        <KpiCard
          icon={Clock}
          label="En retard"
          value={String(stats.overdueCount)}
          color={stats.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}
        />
      </div>

      {/* Low Stock Warning - below KPI cards */}
      {stats.lowStockProducts.length > 0 && (
        <div className="stock-alert-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-destructive mb-1">
                  Alerte stock
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {stats.lowStockProducts.length} produit(s) en dessous du seuil minimum
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {stats.lowStockProducts.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-card border border-destructive/20 px-3 py-2.5 text-sm transition-colors duration-200 hover:border-destructive/40"
                    >
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
        {/* Revenue Evolution */}
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

        {/* Status Distribution */}
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
        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Top 5 clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Pas encore de ventes</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[140px]">{c.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatDT(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dernières factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
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
                    {recentInvoices.map(inv => (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-200 cursor-default">
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
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; trend?: number;
}) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-secondary ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span className={`flex items-center text-xs font-semibold ${trend > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { paid: 'status-paid', unpaid: 'status-unpaid', partial: 'status-partial' };
  const labels: Record<string, string> = { paid: 'Payée', unpaid: 'Impayée', partial: 'Partielle' };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
