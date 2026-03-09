import { useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Eye, FileText, Download } from 'lucide-react';
import { buildPurchaseInvoiceHtml } from '@/lib/generatePurchasePdfHtml';
import { archiveDocument } from '@/lib/archiveService';

interface PurchaseInvoice {
  id: string;
  company_id: string;
  supplier_id: string | null;
  supplier_name: string;
  number: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  tva_total: number;
  total: number;
  status: string;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  items: PurchaseInvoiceItem[];
}

interface PurchaseInvoiceItem {
  id?: string;
  purchase_invoice_id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total: number;
  sort_order?: number;
}

const formatTND = (n: number) => n.toFixed(3) + ' TND';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unpaid: { label: 'Impayée', variant: 'destructive' },
  partial: { label: 'Partielle', variant: 'secondary' },
  paid: { label: 'Payée', variant: 'default' },
};

export default function PurchaseInvoicesPage() {
  const { companyId, user } = useAuth();
  const { suppliers, products, company, refresh: refreshData } = useData();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<PurchaseInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);

  const loadInvoices = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: invs } = await supabase
      .from('purchase_invoices' as any)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    const allInvs = (invs ?? []) as any[];
    
    if (allInvs.length > 0) {
      const ids = allInvs.map((i: any) => i.id);
      const { data: items } = await supabase
        .from('purchase_invoice_items' as any)
        .select('*')
        .in('purchase_invoice_id', ids);

      const allItems = (items ?? []) as any[];
      setInvoices(allInvs.map((inv: any) => ({
        ...inv,
        items: allItems.filter((it: any) => it.purchase_invoice_id === inv.id),
      })));
    } else {
      setInvoices([]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadInvoices(); }, [loadInvoices, counter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    // Reverse stock if items had products
    const inv = invoices.find(i => i.id === deleteId);
    if (inv) {
      for (const item of inv.items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product && companyId) {
            await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.product_id);
            await supabase.from('stock_movements').insert({
              company_id: companyId,
              product_id: item.product_id,
              product_name: item.product_name,
              type: 'out',
              quantity: item.quantity,
              reason: `Annulation facture fournisseur ${inv.number}`,
            });
          }
        }
      }
    }
    await supabase.from('purchase_invoices' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    setCounter(c => c + 1);
    refreshData();
    toast({ title: 'Facture fournisseur supprimée' });
  };

  const openEdit = (inv: PurchaseInvoice) => {
    setEditingInvoice(inv);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingInvoice(null);
    setDialogOpen(true);
  };

  const exportPdf = (inv: PurchaseInvoice) => {
    const html = buildPurchaseInvoiceHtml(
      {
        number: inv.number,
        date: inv.date,
        dueDate: inv.due_date,
        supplierName: inv.supplier_name,
        items: inv.items.map(it => ({ product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate })),
        subtotal: inv.subtotal,
        tvaTotal: inv.tva_total,
        total: inv.total,
        paidAmount: inv.paid_amount,
        status: inv.status,
        notes: inv.notes,
      },
      company ? { name: company.name, matricule_fiscal: company.matricule_fiscal, address: company.address, phone: company.phone, email: company.email, code_tva: company.code_tva } : null
    );
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const totalUnpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total - i.paid_amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid_amount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Factures Fournisseurs</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nouvelle facture</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total factures</p>
          <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total payé</p>
          <p className="text-2xl font-bold text-primary">{formatTND(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Reste à payer</p>
          <p className="text-2xl font-bold text-destructive">{formatTND(totalUnpaid)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Chargement...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Aucune facture fournisseur</p>
          <p className="text-sm mt-1">Créez votre première facture fournisseur</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => {
                const st = STATUS_MAP[inv.status] || STATUS_MAP.unpaid;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                    <TableCell>{inv.supplier_name}</TableCell>
                    <TableCell>{new Date(inv.date).toLocaleDateString('fr-TN')}</TableCell>
                    <TableCell className="text-right font-medium">{formatTND(inv.total)}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewDialog(inv)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => exportPdf(inv)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditingInvoice(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Modifier la facture' : 'Nouvelle facture fournisseur'}</DialogTitle>
          </DialogHeader>
          <PurchaseInvoiceForm
            suppliers={suppliers}
            products={products}
            companyId={companyId}
            company={company}
            userId={user?.id || ''}
            editingInvoice={editingInvoice}
            onDone={() => {
              setDialogOpen(false);
              setEditingInvoice(null);
              setCounter(c => c + 1);
              refreshData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={o => { if (!o) setViewDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Détails — {viewDialog?.number}</DialogTitle>
              {viewDialog && <Button variant="outline" size="sm" onClick={() => exportPdf(viewDialog)}><Download className="mr-2 h-4 w-4" />Exporter PDF</Button>}
            </div>
          </DialogHeader>
          {viewDialog && <PurchaseInvoiceView invoice={viewDialog} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        title="Supprimer cette facture ?"
        description="Cette action est irréversible. Le stock sera ajusté en conséquence."
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ── View Component ── */
function PurchaseInvoiceView({ invoice }: { invoice: PurchaseInvoice }) {
  const st = STATUS_MAP[invoice.status] || STATUS_MAP.unpaid;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Fournisseur:</span> <span className="font-medium">{invoice.supplier_name}</span></div>
        <div><span className="text-muted-foreground">Date:</span> {new Date(invoice.date).toLocaleDateString('fr-TN')}</div>
        {invoice.due_date && <div><span className="text-muted-foreground">Échéance:</span> {new Date(invoice.due_date).toLocaleDateString('fr-TN')}</div>}
        <div><span className="text-muted-foreground">Statut:</span> <Badge variant={st.variant}>{st.label}</Badge></div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">P.U.</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatTND(item.unit_price)}</TableCell>
                <TableCell className="text-right">{item.tva_rate}%</TableCell>
                <TableCell className="text-right">{formatTND(item.quantity * item.unit_price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border pt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span>{formatTND(invoice.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{formatTND(invoice.tva_total)}</span></div>
        <div className="flex justify-between font-bold text-base"><span>Total TTC</span><span>{formatTND(invoice.total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Payé</span><span className="text-primary">{formatTND(invoice.paid_amount)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Reste</span><span className="text-destructive">{formatTND(invoice.total - invoice.paid_amount)}</span></div>
      </div>

      {invoice.notes && <div className="text-sm"><span className="text-muted-foreground">Notes:</span> {invoice.notes}</div>}
    </div>
  );
}

/* ── Form Component ── */
function PurchaseInvoiceForm({
  suppliers,
  products,
  companyId,
  company,
  userId,
  editingInvoice,
  onDone,
}: {
  suppliers: any[];
  products: any[];
  companyId: string | null;
  company: any;
  userId: string;
  editingInvoice: PurchaseInvoice | null;
  onDone: () => void;
}) {
  const [supplierId, setSupplierId] = useState(editingInvoice?.supplier_id || '');
  const [number, setNumber] = useState(editingInvoice?.number || '');
  const [numberLoading, setNumberLoading] = useState(false);
  const [date, setDate] = useState(editingInvoice?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);

  // Auto-generate number for new invoices
  useEffect(() => {
    if (editingInvoice || !companyId) return;
    const generate = async () => {
      setNumberLoading(true);
      try {
        const { data, error } = await supabase.rpc('next_document_number', {
          _company_id: companyId,
          _doc_type: 'facture_achat',
        });
        if (!error && data) setNumber(data as string);
      } catch {}
      setNumberLoading(false);
    };
    generate();
  }, [editingInvoice, companyId]);
  const [dueDate, setDueDate] = useState(editingInvoice?.due_date?.split('T')[0] || '');
  const [status, setStatus] = useState(editingInvoice?.status || 'unpaid');
  const [paidAmount, setPaidAmount] = useState(editingInvoice?.paid_amount || 0);
  const [notes, setNotes] = useState(editingInvoice?.notes || '');
  const [items, setItems] = useState<PurchaseInvoiceItem[]>(
    editingInvoice?.items?.map(it => ({ ...it })) || []
  );
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, {
      product_id: null,
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tva_rate: 19,
      total: 0,
    }]);
  };

  const updateItem = (idx: number, updates: Partial<PurchaseInvoiceItem>) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...updates };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const selectProduct = (idx: number, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    updateItem(idx, { product_id: p.id, product_name: p.name, unit_price: p.purchase_price, tva_rate: p.tva_rate });
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
  const total = subtotal + tvaTotal;

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !number || items.length === 0) {
      toast({ title: 'Champs requis', description: 'Numéro et au moins un article sont requis', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      if (editingInvoice) {
        // Update existing
        await supabase.from('purchase_invoices' as any).update({
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || supplierId || 'Inconnu',
          number,
          date,
          due_date: dueDate || null,
          subtotal,
          tva_total: tvaTotal,
          total,
          status,
          paid_amount: paidAmount,
          notes: notes || null,
        } as any).eq('id', editingInvoice.id);

        // Reverse old stock
        for (const oldItem of editingInvoice.items) {
          if (oldItem.product_id) {
            const { data: product } = await supabase.from('products').select('stock').eq('id', oldItem.product_id).single();
            if (product) {
              await supabase.from('products').update({ stock: Math.max(0, product.stock - oldItem.quantity) }).eq('id', oldItem.product_id);
            }
          }
        }

        // Delete old items
        await supabase.from('purchase_invoice_items' as any).delete().eq('purchase_invoice_id', editingInvoice.id);

        // Insert new items
        const itemsToInsert = items.map((item, idx) => ({
          purchase_invoice_id: editingInvoice.id,
          product_id: item.product_id,
          product_name: item.product_name || 'Article',
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          total: item.quantity * item.unit_price,
          sort_order: idx,
        }));
        await supabase.from('purchase_invoice_items' as any).insert(itemsToInsert as any);

        // Apply new stock
        for (const item of items) {
          if (item.product_id) {
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product) {
              await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.product_id);
              await supabase.from('stock_movements').insert({
                company_id: companyId,
                product_id: item.product_id,
                product_name: item.product_name,
                type: 'in',
                quantity: item.quantity,
                reason: `Facture fournisseur ${number} (modification)`,
              });
            }
          }
        }

        toast({ title: 'Facture modifiée avec succès' });
      } else {
        // Create new
        const { data: inv } = await supabase.from('purchase_invoices' as any).insert({
          company_id: companyId,
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || 'Inconnu',
          number,
          date,
          due_date: dueDate || null,
          subtotal,
          tva_total: tvaTotal,
          total,
          status,
          paid_amount: paidAmount,
          notes: notes || null,
        } as any).select().single();

        if (inv) {
          const invData = inv as any;
          const itemsToInsert = items.map((item, idx) => ({
            purchase_invoice_id: invData.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Article',
            quantity: item.quantity,
            unit_price: item.unit_price,
            tva_rate: item.tva_rate,
            total: item.quantity * item.unit_price,
            sort_order: idx,
          }));
          await supabase.from('purchase_invoice_items' as any).insert(itemsToInsert as any);

          // Increase stock for products
          for (const item of items) {
            if (item.product_id) {
              const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
              if (product) {
                await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.product_id);
                await supabase.from('stock_movements').insert({
                  company_id: companyId,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  type: 'in',
                  quantity: item.quantity,
                  reason: `Facture fournisseur ${number}`,
                });
              }
            }
          }

          toast({ title: 'Facture créée avec succès' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    }

    setSubmitting(false);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fournisseur *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Choisir un fournisseur" /></SelectTrigger>
            <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Numéro de facture *</Label>
          <Input required value={number} readOnly disabled className="bg-muted font-mono" placeholder={numberLoading ? 'Génération...' : 'FA-2026-0001'} />
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>Date d'échéance</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Impayée</SelectItem>
              <SelectItem value="partial">Partielle</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Montant payé (TND)</Label>
          <Input type="number" step="0.001" min={0} value={paidAmount} onChange={e => setPaidAmount(+e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Articles</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" /> Ajouter
          </Button>
        </div>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez au moins un article</p>}
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-4">
              <Select value={item.product_id || '_custom'} onValueChange={v => v === '_custom' ? updateItem(idx, { product_id: null }) : selectProduct(idx, v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Produit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_custom">Saisie libre</SelectItem>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              {!item.product_id && (
                <Input className="h-9 text-xs" placeholder="Nom" value={item.product_name} onChange={e => updateItem(idx, { product_name: e.target.value })} />
              )}
              {item.product_id && <span className="text-xs text-muted-foreground truncate block pt-2">{item.product_name}</span>}
            </div>
            <div className="col-span-1">
              <Input type="number" min={1} className="h-9 text-xs" value={item.quantity} onChange={e => updateItem(idx, { quantity: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Input type="number" step="0.001" className="h-9 text-xs" value={item.unit_price} onChange={e => updateItem(idx, { unit_price: +e.target.value })} />
            </div>
            <div className="col-span-2 text-xs text-right font-medium pt-2">{formatTND(item.quantity * item.unit_price)}</div>
            <div className="col-span-1">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span>{formatTND(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{formatTND(tvaTotal)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total TTC</span><span>{formatTND(total)}</span></div>
        </div>
      )}

      <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>

      <Button type="submit" className="w-full" disabled={submitting || !number || items.length === 0}>
        {submitting ? 'Enregistrement...' : editingInvoice ? 'Modifier' : 'Créer la facture'}
      </Button>
    </form>
  );
}
