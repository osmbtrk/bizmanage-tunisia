import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AnalyticsPage() {
  const { invoices, expenses, products, clients } = useData();
  const [view, setView] = useState<'monthly' | 'daily'>('monthly');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  // Revenue & Expenses over time
  const timeData = useMemo(() => {
    const now = new Date();
    if (view === 'monthly') {
      const months: { label: string; revenue: number; expenses: number; profit: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth(), y = d.getFullYear();
        const label = d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' });
        const rev = invoices.filter(inv => inv.type === 'facture' && new Date(inv.date).getMonth() === m && new Date(inv.date).getFullYear() === y).reduce((s, inv) => s + Number(inv.total), 0);
        const exp = expenses.filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((s, e) => s + Number(e.amount), 0);
        months.push({ label, revenue: rev, expenses: exp, profit: rev - exp });
      }
      return months;
    } else {
      const days: { label: string; revenue: number; expenses: number; profit: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });
        const rev = invoices.filter(inv => inv.type === 'facture' && inv.date === ds).reduce((s, inv) => s + Number(inv.total), 0);
        const exp = expenses.filter(e => e.date === ds).reduce((s, e) => s + Number(e.amount), 0);
        days.push({ label, revenue: rev, expenses: exp, profit: rev - exp });
      }
      return days;
    }
  }, [invoices, expenses, view]);

  const totals = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.type === 'facture').reduce((s, i) => s + Number(i.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return { revenue: totalRevenue, expenses: totalExpenses, profit: totalRevenue - totalExpenses };
  }, [invoices, expenses]);

  // Best selling products (by qty and revenue)
  const bestProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoices.filter(i => i.type === 'facture').forEach(inv => {
      inv.items.forEach(item => {
        const key = item.product_name;
        if (!productSales[key]) productSales[key] = { name: key, qty: 0, revenue: 0 };
        productSales[key].qty += item.quantity;
        productSales[key].revenue += Number(item.total);
      });
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [invoices]);

  // Profit per product (revenue - cost)
  const profitPerProduct = useMemo(() => {
    const productMap: Record<string, { name: string; revenue: number; cost: number; qty: number }> = {};
    invoices.filter(i => i.type === 'facture').forEach(inv => {
      inv.items.forEach(item => {
        const key = item.product_name;
        if (!productMap[key]) productMap[key] = { name: key, revenue: 0, cost: 0, qty: 0 };
        productMap[key].revenue += Number(item.total);
        productMap[key].qty += item.quantity;
        // Find product purchase price
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          productMap[key].cost += item.quantity * Number(prod.purchase_price);
        }
      });
    });
    return Object.values(productMap)
      .map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100) : 0 }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [invoices, products]);

  // Top clients by revenue
  const topClients = useMemo(() => {
    const clientRevenue: Record<string, { name: string; revenue: number; invoiceCount: number }> = {};
    invoices.filter(i => i.type === 'facture').forEach(inv => {
      const key = inv.client_name;
      if (!clientRevenue[key]) clientRevenue[key] = { name: key, revenue: 0, invoiceCount: 0 };
      clientRevenue[key].revenue += Number(inv.total);
      clientRevenue[key].invoiceCount += 1;
    });
    return Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [invoices]);

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
    const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))', 'hsl(210 40% 60%)', 'hsl(280 40% 60%)', 'hsl(160 40% 50%)'];
    return Object.entries(cats).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [expenses]);

  // Client analytics (detailed)
  const clientAnalytics = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(i => i.client_id === client.id && i.type === 'facture');
      const clientDevis = invoices.filter(i => i.client_id === client.id && i.type === 'devis');
      const totalRevenue = clientInvoices.reduce((s, i) => s + Number(i.total), 0);
      const totalProducts = clientInvoices.reduce((s, i) => s + i.items.reduce((si, it) => si + it.quantity, 0), 0);
      const avgOrder = clientInvoices.length > 0 ? totalRevenue / clientInvoices.length : 0;
      const paidCount = clientInvoices.filter(i => i.status === 'paid').length;
      const paymentRate = clientInvoices.length > 0 ? (paidCount / clientInvoices.length) * 100 : 0;
      return { id: client.id, name: client.name, invoiceCount: clientInvoices.length, devisCount: clientDevis.length, totalRevenue, totalProducts, avgOrder, paymentRate, invoices: clientInvoices, devis: clientDevis };
    }).filter(c => c.invoiceCount > 0 || c.devisCount > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [clients, invoices]);

  const selectedClient = selectedClientId ? clientAnalytics.find(c => c.id === selectedClientId) : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytiques</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue globale de la performance</p>
        </div>
        <Select value={view} onValueChange={v => setView(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensuel</SelectItem>
            <SelectItem value="daily">Quotidien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Revenus totaux</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatDT(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dépenses totales</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatDT(totals.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-4 w-4 ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`} />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bénéfice net</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatDT(totals.profit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Revenus vs Dépenses ({view === 'monthly' ? '12 mois' : '30 jours'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ revenue: { label: 'Revenus', color: 'hsl(var(--accent))' }, expenses: { label: 'Dépenses', color: 'hsl(var(--destructive))' } }} className="h-[300px] w-full">
            <BarChart data={timeData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Revenus" />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Dépenses" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Net Profit Evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Évolution du bénéfice net
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ profit: { label: 'Bénéfice', color: 'hsl(var(--success))' } }} className="h-[250px] w-full">
            <LineChart data={timeData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Bénéfice" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Selling Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-4 w-4 inline mr-1" /> Meilleures ventes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucune vente</p>
            ) : (
              <div className="space-y-3">
                {bestProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{i + 1}</span>
                      <div>
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.qty} unités</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatDT(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit per Product */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-4 w-4 inline mr-1" /> Bénéfice par produit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profitPerProduct.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {profitPerProduct.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Revenu: {formatDT(p.revenue)} · Coût: {formatDT(p.cost)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-sm font-semibold tabular-nums block ${p.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatDT(p.profit)}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.margin.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4 inline mr-1" /> Top clients (par revenus)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucun client</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{i + 1}</span>
                      <div>
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{c.invoiceCount} factures</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatDT(c.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Répartition des dépenses
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucune dépense</p>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                        {expenseByCategory.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {expenseByCategory.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="font-semibold">{formatDT(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Analytics Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4 inline mr-1" /> Analytique par client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientAnalytics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune donnée client</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Revenus</TableHead>
                    <TableHead className="text-right">Factures</TableHead>
                    <TableHead className="text-right">Produits achetés</TableHead>
                    <TableHead className="text-right">Panier moyen</TableHead>
                    <TableHead className="text-right">Taux paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientAnalytics.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClientId(c.id)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDT(c.totalRevenue)}</TableCell>
                      <TableCell className="text-right">{c.invoiceCount}</TableCell>
                      <TableCell className="text-right">{c.totalProducts}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDT(c.avgOrder)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.paymentRate >= 80 ? 'default' : c.paymentRate >= 50 ? 'secondary' : 'destructive'}>
                          {c.paymentRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={o => { if (!o) setSelectedClientId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedClient.name} — Détails
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenus</p>
                    <p className="text-lg font-bold tabular-nums">{formatDT(selectedClient.totalRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Factures</p>
                    <p className="text-lg font-bold">{selectedClient.invoiceCount}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Panier moyen</p>
                    <p className="text-lg font-bold tabular-nums">{formatDT(selectedClient.avgOrder)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Produits</p>
                    <p className="text-lg font-bold">{selectedClient.totalProducts}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historique des factures</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numéro</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClient.invoices.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                            <TableCell>{new Date(inv.date).toLocaleDateString('fr-TN')}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatDT(Number(inv.total))}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'partial' ? 'secondary' : 'destructive'}>
                                {inv.status === 'paid' ? 'Payée' : inv.status === 'partial' ? 'Partielle' : 'Impayée'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {selectedClient.devis.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Devis</h3>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Numéro</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedClient.devis.map(d => (
                            <TableRow key={d.id}>
                              <TableCell className="font-mono text-sm">{d.number}</TableCell>
                              <TableCell>{new Date(d.date).toLocaleDateString('fr-TN')}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatDT(Number(d.total))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
