import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, AlertTriangle, Package, Pencil, Check, X, Layers } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const { products, addProduct, deleteProduct, updateProduct, suppliers, categories } = useData();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bomOpen, setBomOpen] = useState(false);
  const [bomProductId, setBomProductId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<{ raw_material_id: string; quantity: number; unit_type: string }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', purchase_price: 0, selling_price: 0,
    tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
    product_type: 'finished_product' as string, category_type: 'normal' as string,
    supplier_id: '' as string, category_id: '' as string,
  });

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => typeFilter === 'all' || p.product_type === typeFilter)
    .filter(p => categoryFilter === 'all' || p.category_id === categoryFilter);

  const rawMaterials = products.filter(p => p.product_type === 'raw_material');

  const getCategoryName = (catId: string | null) => {
    if (!catId) return null;
    const cat = categories.find(c => c.id === catId);
    return cat?.name || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct({
      ...form,
      description: form.description || null,
      supplier_id: form.supplier_id || null,
      category_id: form.category_id || null,
      product_type: form.product_type as any,
      category_type: form.category_type as any,
    } as any);
    setForm({ name: '', description: '', purchase_price: 0, selling_price: 0, tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce', product_type: 'finished_product', category_type: 'normal', supplier_id: '', category_id: '' });
    setOpen(false);
  };

  const openBom = async (productId: string) => {
    setBomProductId(productId);
    const { data } = await supabase.from('bom_items').select('*').eq('finished_product_id', productId);
    setBomItems((data ?? []).map(b => ({ raw_material_id: b.raw_material_id, quantity: Number(b.quantity), unit_type: b.unit_type })));
    setBomOpen(true);
  };

  const saveBom = async () => {
    if (!bomProductId) return;
    await supabase.from('bom_items').delete().eq('finished_product_id', bomProductId);
    if (bomItems.length > 0) {
      await supabase.from('bom_items').insert(
        bomItems.map(b => ({ finished_product_id: bomProductId, raw_material_id: b.raw_material_id, quantity: b.quantity, unit_type: b.unit_type }))
      );
    }
    toast({ title: 'Nomenclature enregistrée' });
    setBomOpen(false);
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
                <div>
                  <Label>Type</Label>
                  <Select value={form.product_type} onValueChange={v => setForm(f => ({ ...f, product_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished_product">Produit fini</SelectItem>
                      <SelectItem value="raw_material">Matière première</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v === '_none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucune</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.parent_id ? '  └ ' : ''}{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.product_type === 'raw_material' && (
                <div>
                  <Label>Fournisseur</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un produit..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="finished_product">Produit fini</SelectItem>
            <SelectItem value="raw_material">Matière première</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.parent_id ? '  └ ' : ''}{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Catégorie</th>
                <th className="pb-3 font-medium">Prix vente</th>
                <th className="pb-3 font-medium">TVA</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const typeLabels: Record<string, string> = { finished_product: 'Produit fini', raw_material: 'Matière 1ère', service: 'Service' };
                const catName = getCategoryName(p.category_id);
                return (
                <tr key={p.id} className="border-b border-border last:border-0 transition-colors duration-200 hover:bg-muted/50">
                  <td className="py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </td>
                  <td className="py-3">
                    <Badge variant="outline" className="text-xs">{typeLabels[p.product_type] || p.product_type}</Badge>
                  </td>
                  <td className="py-3">
                    {catName ? (
                      <Badge variant="secondary" className="text-xs">{catName}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3">{Number(p.selling_price).toFixed(3)} TND</td>
                  <td className="py-3">{p.tva_rate}%</td>
                  <td className="py-3">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} className="h-8 w-20 text-xs" value={editStock} onChange={e => setEditStock(+e.target.value)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => { updateProduct(p.id, { stock: editStock }); setEditingId(null); }}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className={`flex items-center gap-1 cursor-pointer ${p.stock <= p.min_stock ? 'text-warning font-semibold' : ''}`} onClick={() => { setEditingId(p.id); setEditStock(p.stock); }}>
                        {p.stock <= p.min_stock && <AlertTriangle className="h-3.5 w-3.5" />}
                        {p.stock} {p.unit}
                        <Pencil className="h-3 w-3 ml-1 opacity-40" />
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {p.product_type === 'finished_product' && (
                        <Button variant="ghost" size="icon" onClick={() => openBom(p.id)} className="text-muted-foreground hover:text-primary" title="Nomenclature (BOM)">
                          <Layers className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BOM Dialog */}
      <Dialog open={bomOpen} onOpenChange={setBomOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Nomenclature (BOM)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Définir les matières premières nécessaires pour fabriquer ce produit.</p>
            {bomItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label className="text-xs">Matière première</Label>
                  <Select value={item.raw_material_id} onValueChange={v => setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, raw_material_id: v } : b))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{rawMaterials.map(rm => <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Quantité</Label>
                  <Input type="number" step="0.01" min={0} className="h-9 text-xs" value={item.quantity} onChange={e => setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, quantity: +e.target.value } : b))} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Type</Label>
                  <Select value={item.unit_type} onValueChange={v => setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, unit_type: v } : b))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixe</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setBomItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setBomItems(prev => [...prev, { raw_material_id: rawMaterials[0]?.id || '', quantity: 1, unit_type: 'fixed' }])} disabled={rawMaterials.length === 0}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter matière
            </Button>
            {rawMaterials.length === 0 && <p className="text-xs text-muted-foreground">Créez d'abord des produits de type "Matière première"</p>}
            <Button className="w-full" onClick={saveBom}>Enregistrer la nomenclature</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer ce produit ?"
        description="Le produit sera supprimé définitivement. Cette action est irréversible."
        onConfirm={() => { if (deleteTarget) { deleteProduct(deleteTarget); setDeleteTarget(null); } }}
      />
    </div>
  );
}
