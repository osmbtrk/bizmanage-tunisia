import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Receipt, TrendingUp, TrendingDown, Scale, Calendar, FileText, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const TVA_RATES = [0, 7, 13, 19];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)'];
const formatTND = (n: number) => n.toFixed(3) + ' TND';

export default function TaxesPage() {
  const { invoices, expenses } = useData();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const years = useMemo(() => {
    const allDates = [
      ...invoices.map(i => new Date(i.date).getFullYear()),
      ...expenses.map(e => new Date(e.date).getFullYear()),
    ];
    const uniqueYears = [...new Set(allDates)].sort((a, b) => b - a);
    return uniqueYears.length > 0 ? uniqueYears : [currentYear];
  }, [invoices, expenses, currentYear]);

  const yearNum = parseInt(selectedYear);

  const yearInvoices = useMemo(
    () => invoices.filter(i => i.type === 'facture' && new Date(i.date).getFullYear() === yearNum),
    [invoices, yearNum]
  );
  const yearExpenses = useMemo(
    () => expenses.filter(e => new Date(e.date).getFullYear() === yearNum),
    [expenses, yearNum]
  );

  // KPI stats
  const stats = useMemo(() => {
    const tvaCollected = yearInvoices.reduce((s, i) => s + (i.tva_total || 0), 0);
    const tvaPaid = yearExpenses.reduce((s, e) => s + (e.tva_amount || 0), 0);
    const caHT = yearInvoices.reduce((s, i) => s + (i.subtotal || 0), 0);
    const caTTC = yearInvoices.reduce((s, i) => s + (i.total || 0), 0);
    return { tvaCollected, tvaPaid, net: tvaCollected - tvaPaid, caHT, caTTC };
  }, [yearInvoices, yearExpenses]);

  // Breakdown by TVA rate
  const rateBreakdown = useMemo(() => {
    return TVA_RATES.map(rate => {
      const collected = yearInvoices.reduce((s, inv) => {
        return s + inv.items.filter(it => it.tva_rate === rate).reduce((ss, it) => ss + (it.quantity * it.unit_price * it.tva_rate) / 100, 0);
      }, 0);
      const deductible = yearExpenses.filter(e => e.tva_rate === rate).reduce((s, e) => s + (e.tva_amount || 0), 0);
      const baseHT = yearInvoices.reduce((s, inv) => {
        return s + inv.items.filter(it => it.tva_rate === rate).reduce((ss, it) => ss + it.quantity * it.unit_price, 0);
      }, 0);
      return { rate: `${rate}%`, collected, deductible, net: collected - deductible, baseHT };
    }).filter(r => r.collected > 0 || r.deductible > 0 || r.baseHT > 0);
  }, [yearInvoices, yearExpenses]);

  // Monthly/quarterly chart data
  const chartData = useMemo(() => {
    if (selectedPeriod === 'monthly') {
      return Array.from({ length: 12 }, (_, m) => {
        const mInvoices = yearInvoices.filter(i => new Date(i.date).getMonth() === m);
        const mExpenses = yearExpenses.filter(e => new Date(e.date).getMonth() === m);
        return {
          name: MONTHS[m],
          collected: mInvoices.reduce((s, i) => s + (i.tva_total || 0), 0),
          deductible: mExpenses.reduce((s, e) => s + (e.tva_amount || 0), 0),
        };
      });
    } else {
      return [0, 1, 2, 3].map(q => {
        const qInvoices = yearInvoices.filter(i => Math.floor(new Date(i.date).getMonth() / 3) === q);
        const qExpenses = yearExpenses.filter(e => Math.floor(new Date(e.date).getMonth() / 3) === q);
        return {
          name: `T${q + 1}`,
          collected: qInvoices.reduce((s, i) => s + (i.tva_total || 0), 0),
          deductible: qExpenses.reduce((s, e) => s + (e.tva_amount || 0), 0),
        };
      });
    }
  }, [yearInvoices, yearExpenses, selectedPeriod]);

  // Pie chart data for TVA rate distribution
  const pieData = useMemo(() => {
    return rateBreakdown.filter(r => r.collected > 0).map(r => ({
      name: `TVA ${r.rate}`,
      value: r.collected,
    }));
  }, [rateBreakdown]);

  // Recent declarations / period summary
  const periodSummary = useMemo(() => {
    return (selectedPeriod === 'quarterly' ? [0, 1, 2, 3] : Array.from({ length: 12 }, (_, i) => i))
      .map(p => {
        const filter = (date: string) => {
          const d = new Date(date);
          return selectedPeriod === 'quarterly'
            ? Math.floor(d.getMonth() / 3) === p
            : d.getMonth() === p;
        };
        const pInvoices = yearInvoices.filter(i => filter(i.date));
        const pExpenses = yearExpenses.filter(e => filter(e.date));
        const collected = pInvoices.reduce((s, i) => s + (i.tva_total || 0), 0);
        const deductible = pExpenses.reduce((s, e) => s + (e.tva_amount || 0), 0);
        const net = collected - deductible;
        const label = selectedPeriod === 'quarterly' ? `T${p + 1} ${yearNum}` : `${MONTHS[p]} ${yearNum}`;
        return { label, collected, deductible, net, nbInvoices: pInvoices.length, nbExpenses: pExpenses.length };
      })
      .filter(p => p.collected > 0 || p.deductible > 0);
  }, [yearInvoices, yearExpenses, selectedPeriod, yearNum]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Taxes & TVA</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]"><Calendar className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={v => setSelectedPeriod(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="quarterly">Trimestriel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA collectée</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatTND(stats.tvaCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">{yearInvoices.length} factures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA déductible</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatTND(stats.tvaPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">{yearExpenses.length} dépenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA nette</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatTND(stats.net)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.net >= 0 ? 'À reverser à l\'État' : 'Crédit de TVA'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA HT</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatTND(stats.caHT)}</div>
            <p className="text-xs text-muted-foreground mt-1">TTC: {formatTND(stats.caTTC)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution TVA — {selectedPeriod === 'monthly' ? 'Mensuelle' : 'Trimestrielle'}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.some(d => d.collected > 0 || d.deductible > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}`} />
                  <Tooltip
                    formatter={(value: number) => formatTND(value)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="collected" name="TVA collectée" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deductible" name="TVA déductible" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Aucune donnée pour {selectedYear}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par taux</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatTND(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by TVA Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par taux de TVA</CardTitle>
        </CardHeader>
        <CardContent>
          {rateBreakdown.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taux TVA</TableHead>
                    <TableHead className="text-right">Base HT</TableHead>
                    <TableHead className="text-right">TVA collectée</TableHead>
                    <TableHead className="text-right">TVA déductible</TableHead>
                    <TableHead className="text-right">TVA nette</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateBreakdown.map(r => (
                    <TableRow key={r.rate}>
                      <TableCell><Badge variant="outline">{r.rate}</Badge></TableCell>
                      <TableCell className="text-right">{formatTND(r.baseHT)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatTND(r.collected)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatTND(r.deductible)}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.net >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatTND(r.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatTND(rateBreakdown.reduce((s, r) => s + r.baseHT, 0))}</TableCell>
                    <TableCell className="text-right text-green-600">{formatTND(stats.tvaCollected)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatTND(stats.tvaPaid)}</TableCell>
                    <TableCell className={`text-right ${stats.net >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatTND(stats.net)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Aucune donnée fiscale pour {selectedYear}</p>
          )}
        </CardContent>
      </Card>

      {/* Period Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Récapitulatif {selectedPeriod === 'quarterly' ? 'trimestriel' : 'mensuel'} — {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periodSummary.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-center">Factures</TableHead>
                    <TableHead className="text-center">Dépenses</TableHead>
                    <TableHead className="text-right">TVA collectée</TableHead>
                    <TableHead className="text-right">TVA déductible</TableHead>
                    <TableHead className="text-right">Solde TVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodSummary.map(p => (
                    <TableRow key={p.label}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{p.nbInvoices}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{p.nbExpenses}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">{formatTND(p.collected)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatTND(p.deductible)}</TableCell>
                      <TableCell className={`text-right font-semibold ${p.net >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatTND(p.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Aucune activité pour {selectedYear}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
