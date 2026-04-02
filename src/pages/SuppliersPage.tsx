import { useState, useCallback, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseInvoicesApi, productsApi, stockMovementsApi, expensesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, Truck, Eye, FileText, DollarSign, Package, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuppliersPage() {
  const { suppliers, addSupplier, deleteSupplier } = useData();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', tax_id: '' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addSupplier({
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        tax_id: form.tax_id || null,
      } as any);
      setForm({ name: '', address: '', phone: '', email: '', tax_id: '' });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const loadSupplierHistory = useCallback(async (supplierId: string) => {
    if (!companyId) return;
    setLoadingHistory(true);
    setSelectedSupplier(supplierId);
    const { data: invs } = await purchaseInvoicesApi.fetchPurchaseInvoices(companyId);
    const filtered = (invs ?? []).filter((i: any) => i.supplier_id === supplierId);
    
    if (filtered.length > 0) {
      const ids = filtered.map((i: any) => i.id);
      const { data: items } = await purchaseInvoicesApi.fetchPurchaseInvoiceItems(ids);
      setSupplierInvoices(filtered.map((inv: any) => ({
        ...inv,
        items: (items ?? []).filter((it: any) => it.purchase_invoice_id === inv.id),
      })));
    } else {
      setSupplierInvoices([]);
    }
    setLoadingHistory(false);
  }, [companyId]);

  const selectedSupplierObj = suppliers.find(s => s.id === selectedSupplier);
  const totalSpent = supplierInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = supplierInvoices.reduce((s, i) => s + Number(i.paid_amount), 0);

  // Products supplied (from invoice items)
  const productsSupplied = supplierInvoices.flatMap((inv: any) =>
    (inv.items || []).map((it: any) => ({
      name: it.product_name,
      qty: it.quantity,
      total: it.quantity * it.unit_price,
    }))
  );
  const uniqueProducts: Record<string, { name: string; qty: number; total: number }> = {};
  productsSupplied.forEach(p => {
    if (!uniqueProducts[p.name]) uniqueProducts[p.name] = { name: p.name, qty: 0, total: 0 };
    uniqueProducts[p.name].qty += p.qty;
    uniqueProducts[p.name].total += p.total;
  });

  const formatTND = (n: number) => n.toFixed(3) + ' TND';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Fournisseurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un fournisseur</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nom *</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div><Label>Matricule fiscal</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un fournisseur..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun fournisseur trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <div key={s.id} className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadSupplierHistory(s.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.phone && <p className="text-sm text-muted-foreground mt-1">{s.phone}</p>}
                  {s.email && <p className="text-sm text-muted-foreground">{s.email}</p>}
                  {s.tax_id && <p className="text-xs text-muted-foreground mt-1">MF: {s.tax_id}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); loadSupplierHistory(s.id); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s.id); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier History Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={o => { if (!o) setSelectedSupplier(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSupplierObj && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  {selectedSupplierObj.name} — Historique
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total dépensé</p>
                    <p className="text-lg font-bold tabular-nums">{formatTND(totalSpent)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Factures</p>
                    <p className="text-lg font-bold">{supplierInvoices.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto text-destructive mb-1" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reste à payer</p>
                    <p className="text-lg font-bold tabular-nums text-destructive">{formatTND(totalSpent - totalPaid)}</p>
                  </div>
                </div>

                {/* Products Supplied */}
                {Object.keys(uniqueProducts).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Produits fournis
                    </h3>
                    <div className="space-y-1.5">
                      {Object.values(uniqueProducts).sort((a, b) => b.total - a.total).map((p, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">{p.qty} unités — {formatTND(p.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice Timeline */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historique des factures</h3>
                  {loadingHistory ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
                  ) : supplierInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucune facture</p>
                  ) : (
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
                          {supplierInvoices
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(inv => (
                              <TableRow key={inv.id}>
                                <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                                <TableCell>{new Date(inv.date).toLocaleDateString('fr-TN')}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatTND(Number(inv.total))}</TableCell>
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
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer ce fournisseur ?"
        description="Le fournisseur sera supprimé définitivement."
        onConfirm={() => { if (deleteTarget) { deleteSupplier(deleteTarget); setDeleteTarget(null); } }}
      />
    </div>
  );
}
