import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, AlertTriangle, Package, Pencil, Check, X } from 'lucide-react';

export default function ProductsPage() {
  const { products, addProduct, deleteProduct, updateProduct } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', purchase_price: 0, selling_price: 0,
    tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
  });

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(form as any);
    setForm({ name: '', description: '', purchase_price: 0, selling_price: 0, tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce' });
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Produits & Stock</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau produit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nom *</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix d'achat (TND)</Label><Input type="number" step="0.001" min={0} value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: +e.target.value }))} /></div>
                <div><Label>Prix de vente (TND)</Label><Input type="number" step="0.001" min={0} value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                <div><Label>Stock initial</Label><Input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} /></div>
                <div><Label>Stock min</Label><Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: +e.target.value }))} /></div>
              </div>
              <div><Label>Unité</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un produit..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 font-medium">Produit</th>
                <th className="pb-3 font-medium">Prix vente</th>
                <th className="pb-3 font-medium">TVA</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 transition-colors duration-200 hover:bg-muted/50">
                  <td className="py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </td>
                  <td className="py-3">{Number(p.selling_price).toFixed(3)} TND</td>
                  <td className="py-3">{p.tva_rate}%</td>
                  <td className="py-3">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} className="h-8 w-20 text-xs" value={editStock} onChange={e => setEditStock(+e.target.value)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--success))]" onClick={() => { updateProduct(p.id, { stock: editStock }); setEditingId(null); }}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className={`flex items-center gap-1 cursor-pointer ${p.stock <= p.min_stock ? 'text-[hsl(var(--warning))] font-semibold' : ''}`} onClick={() => { setEditingId(p.id); setEditStock(p.stock); }}>
                        {p.stock <= p.min_stock && <AlertTriangle className="h-3.5 w-3.5" />}
                        {p.stock} {p.unit}
                        <Pencil className="h-3 w-3 ml-1 opacity-40" />
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
