import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FolderTree, ChevronRight } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

export default function CategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parent_id: '' });

  const parentCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);
  const getProductCount = (catId: string) => products.filter(p => p.category_id === catId).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCategory({ name: form.name, parent_id: form.parent_id || null });
    setForm({ name: '', parent_id: '' });
    setOpen(false);
    toast({ title: 'Catégorie créée' });
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateCategory(id, { name: editName });
    setEditId(null);
    toast({ title: 'Catégorie mise à jour' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteCategory(deleteTarget);
    if (success) toast({ title: 'Catégorie supprimée' });
    setDeleteTarget(null);
  };

  const CategoryRow = ({ cat, isChild = false }: { cat: typeof categories[0]; isChild?: boolean }) => {
    const count = getProductCount(cat.id);
    const children = getChildren(cat.id);
    const isEditing = editId === cat.id;

    return (
      <>
        <div className={`flex items-center gap-3 py-3 px-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${isChild ? 'pl-10' : ''}`}>
          {isChild && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          <FolderTree className={`h-4 w-4 shrink-0 ${isChild ? 'text-muted-foreground' : 'text-primary'}`} />
          
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(cat.id); if (e.key === 'Escape') setEditId(null); }}
              />
              <Button size="sm" variant="ghost" onClick={() => handleEdit(cat.id)} className="h-8">Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8">Annuler</Button>
            </div>
          ) : (
            <>
              <span className="font-medium text-sm flex-1">{cat.name}</span>
              <Badge variant="secondary" className="text-xs">{count} produit{count !== 1 ? 's' : ''}</Badge>
              {!isChild && children.length > 0 && (
                <Badge variant="outline" className="text-xs">{children.length} sous-cat.</Badge>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(cat.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        {children.map(child => (
          <CategoryRow key={child.id} cat={child} isChild />
        ))}
      </>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Catégories de produits</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Ajouter une catégorie</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Électronique" />
              </div>
              <div>
                <Label>Catégorie parente (optionnel)</Label>
                <Select value={form.parent_id} onValueChange={v => setForm(f => ({ ...f, parent_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucune (catégorie racine)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucune (catégorie racine)</SelectItem>
                    {parentCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderTree className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucune catégorie créée</p>
          <p className="text-sm mt-1">Créez des catégories pour organiser vos produits</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {parentCategories.map(cat => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
            {/* Orphan categories (parent deleted) */}
            {categories.filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id)).map(cat => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
        title="Supprimer cette catégorie ?"
        description="Si des produits utilisent cette catégorie, la suppression sera refusée."
        onConfirm={handleDelete}
      />
    </div>
  );
}
