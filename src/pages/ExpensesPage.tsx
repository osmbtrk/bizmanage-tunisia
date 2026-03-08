import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Receipt, Calendar, Package } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

const categories = [
  'Loyer', 'Électricité', 'Eau', 'Internet', 'Téléphone',
  'Transport', 'Fournitures', 'Salaires', 'Impôts', 'Achat matières', 'Autre',
];

const recurrencePeriods = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly', label: 'Annuel' },
];

interface StockLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, suppliers, products } = useData();
  const [open, setOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [form, setForm] = useState({
    description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'Autre',
    tva_rate: 19, is_recurring: false, recurrence_period: '' as string, supplier_id: '' as string,
  });
  const [stockLines, setStockLines] = useState<StockLineItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Raw materials for selected supplier
  const supplierRawMaterials = useMemo(() => {
    if (!form.supplier_id) return [];
    return products.filter(p => p.product_type === 'raw_material' && p.supplier_id === form.supplier_id);
  }, [products, form.supplier_id]);

  // Auto-calc TVA
  const amountHT = form.tva_rate > 0 ? form.amount / (1 + form.tva_rate / 100) : form.amount;
  const tvaAmount = form.amount - amountHT;

  const addStockLine = () => {
    setStockLines(prev => [...prev, { product_id: '', product_name: '', quantity: 1 }]);
  };

  const updateStockLine = (idx: number, field: keyof StockLineItem, value: string | number) => {
    setStockLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      if (field === 'product_id') {
        const p = products.find(pr => pr.id === value);
        return { ...line, product_id: value as string, product_name: p?.name || '' };
      }
      return { ...line, [field]: value };
    }));
  };

  const removeStockLine = (idx: number) => {
    setStockLines(prev => prev.filter((_, i) => i !== idx));
  };

  const sorted = useMemo(() => {
    let list = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (monthFilter !== 'all') {
      const [y, m] = monthFilter.split('-').map(Number);
      list = list.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      });
    }
    if (categoryFilter !== 'all') {
      list = list.filter(e => e.category === categoryFilter);
    }
    return list;
  }, [expenses, monthFilter, categoryFilter]);

  const monthlyGroups = useMemo(() => {
    const groups: Record<string, { total: number; tva: number; count: number }> = {};
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { total: 0, tva: 0, count: 0 };
      groups[key].total += Number(e.amount);
      groups[key].tva += Number(e.tva_amount || 0);
      groups[key].count++;
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      const d = new Date(e.date);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const total = sorted.reduce((s, e) => s + Number(e.amount), 0);
  const totalTVA = sorted.reduce((s, e) => s + Number(e.tva_amount || 0), 0);
  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validStockLines = stockLines.filter(sl => sl.product_id && sl.quantity > 0);
    await addExpense({
      description: form.description,
      amount: form.amount,
      date: form.date,
      category: form.category,
      tva_rate: form.tva_rate,
      amount_ht: amountHT,
      tva_amount: tvaAmount,
      is_recurring: form.is_recurring,
      recurrence_period: form.is_recurring ? form.recurrence_period : null,
      supplier_id: form.supplier_id || null,
    } as any, validStockLines.length > 0 ? validStockLines : undefined);
    setForm({ description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'Autre', tva_rate: 19, is_recurring: false, recurrence_period: '', supplier_id: '' });
    setStockLines([]);
    setOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dépenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Total: {formatDT(total)} — TVA: {formatDT(totalTVA)}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle dépense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Ajouter une dépense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Description *</Label><Input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Montant TTC (TND)</Label><Input type="number" step="0.001" min={0} required value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
                <div>
                  <Label>TVA %</Label>
                  <Select value={String(form.tva_rate)} onValueChange={v => setForm(f => ({ ...f, tva_rate: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="13">13%</SelectItem>
                      <SelectItem value="19">19%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.amount > 0 && (
                <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 space-y-1">
                  <div className="flex justify-between"><span>HT</span><span>{amountHT.toFixed(3)} TND</span></div>
                  <div className="flex justify-between"><span>TVA ({form.tva_rate}%)</span><span>{tvaAmount.toFixed(3)} TND</span></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Fournisseur (optionnel)</Label>
                <Select value={form.supplier_id || 'none'} onValueChange={v => setForm(f => ({ ...f, supplier_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
                <Label>Dépense récurrente</Label>
              </div>
              {form.is_recurring && (
                <div>
                  <Label>Période</Label>
                  <Select value={form.recurrence_period} onValueChange={v => setForm(f => ({ ...f, recurrence_period: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{recurrencePeriods.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {/* Raw material stock lines when supplier selected */}
              {form.supplier_id && (
                <div className="space-y-2 border rounded-lg p-3 bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Matières premières reçues
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addStockLine} className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                    </Button>
                  </div>
                  {supplierRawMaterials.length === 0 && stockLines.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucune matière première liée à ce fournisseur.</p>
                  )}
                  {stockLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={line.product_id} onValueChange={v => updateStockLine(idx, 'product_id', v)}>
                        <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Matière première..." /></SelectTrigger>
                        <SelectContent>
                          {supplierRawMaterials.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} (stock: {p.stock})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={1} value={line.quantity || ''}
                        onChange={e => updateStockLine(idx, 'quantity', +e.target.value)}
                        className="w-20 h-8 text-xs" placeholder="Qté"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStockLine(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Summary Cards */}
      {monthlyGroups.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {monthlyGroups.slice(0, 6).map(([month, data]) => {
            const [y, m] = month.split('-');
            const label = new Date(+y, +m - 1).toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' });
            return (
              <Card key={month} className={`cursor-pointer transition-all duration-200 hover:shadow-md ${monthFilter === month ? 'ring-2 ring-primary' : ''}`} onClick={() => setMonthFilter(monthFilter === month ? 'all' : month)}>
                <CardContent className="p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold tabular-nums mt-1">{formatDT(data.total)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.count} dépense(s)</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              return <SelectItem key={m} value={m}>{new Date(+y, +mo - 1).toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucune dépense enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(exp => (
            <div key={exp.id} className="stat-card flex items-center justify-between transition-all duration-200 hover:shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{exp.description}</p>
                  {exp.is_recurring && <Badge variant="outline" className="text-[10px]"><Calendar className="h-2.5 w-2.5 mr-1" />Récurrent</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{exp.category}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString('fr-TN')}</span>
                  {Number(exp.tva_amount) > 0 && (
                    <span className="text-xs text-muted-foreground">TVA: {Number(exp.tva_amount).toFixed(3)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="font-bold tabular-nums">{Number(exp.amount).toFixed(3)} TND</span>
                  {Number(exp.amount_ht) > 0 && (
                    <p className="text-[10px] text-muted-foreground">HT: {Number(exp.amount_ht).toFixed(3)}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
