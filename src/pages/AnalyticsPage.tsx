import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';

export default function AnalyticsPage() {
  const { invoices, expenses, products } = useData();
  const [view, setView] = useState<'monthly' | 'daily'>('monthly');

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

  // Totals
  const totals = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.type === 'facture').reduce((s, i) => s + Number(i.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return { revenue: totalRevenue, expenses: totalExpenses, profit: totalRevenue - totalExpenses };
  }, [invoices, expenses]);

  // Best selling products
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

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    });
    const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))', 'hsl(210 40% 60%)', 'hsl(280 40% 60%)', 'hsl(160 40% 50%)'];
    return Object.entries(cats).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [expenses]);

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
              <DollarSign className={`h-4 w-4 ${totals.profit >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`} />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bénéfice net</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${totals.profit >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{formatDT(totals.profit)}</p>
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
          <ChartContainer config={{
            revenue: { label: 'Revenus', color: 'hsl(var(--accent))' },
            expenses: { label: 'Dépenses', color: 'hsl(var(--destructive))' },
          }} className="h-[300px] w-full">
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

      {/* Profit Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Évolution du bénéfice net
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            profit: { label: 'Bénéfice', color: 'hsl(var(--success))' },
          }} className="h-[250px] w-full">
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
    </div>
  );
}
