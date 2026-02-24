import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Receipt } from 'lucide-react';

const categories = [
  'Loyer', 'Électricité', 'Eau', 'Internet', 'Téléphone',
  'Transport', 'Fournitures', 'Salaires', 'Impôts', 'Autre',
];

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'Autre',
  });

  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense(form);
    setForm({ description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'Autre' });
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dépenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Total: {total.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle dépense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter une dépense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Description *</Label><Input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Montant (TND)</Label><Input type="number" step="0.001" min={0} required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Catégorie</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucune dépense enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(exp => (
            <div key={exp.id} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium">{exp.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">{exp.category}</span>
                  <span className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString('fr-TN')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{exp.amount.toFixed(3)} TND</span>
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
