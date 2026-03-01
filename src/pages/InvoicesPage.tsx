import { useState, useMemo } from 'react';
import { useData, type DocumentType } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, FileText, Download, Calendar } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/generatePdf';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface InvoicesPageProps {
  docType: DocumentType;
  title: string;
}

function getDateRange(period: PeriodFilter, customStart?: string, customEnd?: string): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year': return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      if (customStart && customEnd) return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
      return null;
    default: return null;
  }
}

export default function InvoicesPage({ docType, title }: InvoicesPageProps) {
  const { invoices, addInvoice, deleteInvoice, updateInvoiceStatus, clients, products, company } = useData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const isFacture = docType === 'facture';

  const filtered = useMemo(() => {
    let list = invoices
      .filter(i => i.type === docType)
      .filter(i => i.number.includes(search) || i.client_name.toLowerCase().includes(search.toLowerCase()));

    if (isFacture && period !== 'all') {
      const range = getDateRange(period, customStart, customEnd);
      if (range) {
        list = list.filter(i => isWithinInterval(new Date(i.date), range));
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, docType, search, period, customStart, customEnd, isFacture]);

  const totals = useMemo(() => {
    if (!isFacture) return null;
    const ht = filtered.reduce((s, i) => s + Number(i.subtotal), 0);
    const tva = filtered.reduce((s, i) => s + Number(i.tva_total), 0);
    const ttc = filtered.reduce((s, i) => s + Number(i.total), 0);
    const unpaid = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);
    return { ht, tva, ttc, unpaid };
  }, [filtered, isFacture]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset page when filters change
  useMemo(() => setCurrentPage(1), [period, customStart, customEnd, search, perPage]);

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  const periodButtons: { value: PeriodFilter; label: string }[] = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Créer {title.toLowerCase()}</DialogTitle></DialogHeader>
            <InvoiceForm
              docType={docType}
              clients={clients}
              products={products}
              company={company}
              onSubmit={async (data) => {
                await addInvoice(data);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Period Filter - Only for Factures */}
      {isFacture && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {periodButtons.map(pb => (
              <Button
                key={pb.value}
                variant={period === pb.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(pb.value)}
                className="text-xs"
              >
                {pb.value === 'custom' && <Calendar className="mr-1.5 h-3 w-3" />}
                {pb.label}
              </Button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex gap-3 items-end">
              <div>
                <Label className="text-xs">Du</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 text-xs w-40" />
              </div>
              <div>
                <Label className="text-xs">Au</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 text-xs w-40" />
              </div>
            </div>
          )}

          {/* Summary totals */}
          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card p-3">
                <p className="text-xs text-muted-foreground">Total HT</p>
                <p className="text-sm font-bold">{formatDT(totals.ht)}</p>
              </div>
              <div className="stat-card p-3">
                <p className="text-xs text-muted-foreground">TVA</p>
                <p className="text-sm font-bold">{formatDT(totals.tva)}</p>
              </div>
              <div className="stat-card p-3">
                <p className="text-xs text-muted-foreground">Total TTC</p>
                <p className="text-sm font-bold text-primary">{formatDT(totals.ttc)}</p>
              </div>
              <div className="stat-card p-3">
                <p className="text-xs text-muted-foreground">Impayés</p>
                <p className="text-sm font-bold text-destructive">{formatDT(totals.unpaid)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {paginated.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(inv => (
            <div key={inv.id} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{inv.number}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{inv.client_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString('fr-TN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="font-bold text-lg">{formatDT(inv.total)}</p>
                    {inv.status === 'partial' && (
                      <p className="text-xs text-muted-foreground">Payé: {formatDT(inv.paid_amount)}</p>
                    )}
                  </div>
                  {docType === 'facture' && inv.status !== 'paid' && (
                    <Select value={inv.status} onValueChange={v => updateInvoiceStatus(inv.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Payée</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="unpaid">Impayée</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => generateInvoicePdf({ ...inv, clientName: inv.client_name, subtotal: inv.subtotal, tvaTotal: inv.tva_total, paidAmount: inv.paid_amount }, company)} className="text-muted-foreground hover:text-accent" title="Télécharger PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteInvoice(inv.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Afficher</span>
            <Select value={String(perPage)} onValueChange={v => setPerPage(Number(v))}>
              <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">sur {filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="text-xs h-8">
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-xs h-8">
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceForm({ docType, clients, products, company, onSubmit }: {
  docType: DocumentType;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; selling_price: number; tva_rate: number; stock: number }[];
  company: any;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(company?.payment_terms || 'Paiement à 30 jours');
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setItems([...items, {
      product_id: p.id, product_name: p.name,
      quantity: 1, unit_price: p.selling_price, tva_rate: p.tva_rate,
      total: p.selling_price,
    }]);
  };

  const updateItem = (idx: number, updates: any) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...updates };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const selectProduct = (idx: number, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    updateItem(idx, { product_id: p.id, product_name: p.name, unit_price: p.selling_price, tva_rate: p.tva_rate });
  };

  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  const tvaTotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0);
  const total = subtotal + tvaTotal;

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;

    // Stock validation for factures and bons de livraison
    if (docType === 'facture' || docType === 'bon_livraison') {
      const insufficientItems = items
        .map((item: any) => {
          const product = products.find(p => p.id === item.product_id);
          if (product && item.quantity > product.stock) {
            return { name: product.name, stock: product.stock, requested: item.quantity };
          }
          return null;
        })
        .filter(Boolean);

      if (insufficientItems.length > 0) {
        const message = insufficientItems
          .map((i: any) => `• ${i.name} : stock disponible ${i.stock}, demandé ${i.requested}`)
          .join('\n');
        alert(`⚠️ Stock insuffisant !\n\nVeuillez réapprovisionner les produits suivants :\n${message}`);
        return;
      }
    }

    setSubmitting(true);
    await onSubmit({
      type: docType, date, due_date: dueDate || undefined,
      client_id: clientId, client_name: selectedClient?.name || '',
      items, status: 'unpaid', paid_amount: 0,
      payment_terms: paymentTerms, notes,
    });
    setSubmitting(false);
  };

  const formatDT = (n: number) => n.toFixed(3) + ' TND';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>Date d'échéance</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div><Label>Conditions de paiement</Label><Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Articles</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={products.length === 0}>
            <Plus className="mr-1 h-3 w-3" /> Ajouter
          </Button>
        </div>
        {products.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez d'abord des produits</p>}
        {items.map((item: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-5">
              <Select value={item.product_id} onValueChange={v => selectProduct(idx, v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input type="number" min={1} className="h-9 text-xs" value={item.quantity} onChange={e => updateItem(idx, { quantity: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Input type="number" step="0.001" className="h-9 text-xs" value={item.unit_price} onChange={e => updateItem(idx, { unit_price: +e.target.value })} />
            </div>
            <div className="col-span-2 text-xs text-right font-medium pt-2">{formatDT(item.quantity * item.unit_price)}</div>
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
          <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span>{formatDT(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{formatDT(tvaTotal)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total TTC</span><span>{formatDT(total)}</span></div>
        </div>
      )}

      <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>

      <div className="border-t border-border pt-3 text-xs text-muted-foreground">
        <p>Zone de signature : _________________________</p>
      </div>

      <Button type="submit" className="w-full" disabled={!clientId || items.length === 0 || submitting}>
        {submitting ? 'Création...' : 'Créer le document'}
      </Button>
    </form>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { paid: 'status-paid', unpaid: 'status-unpaid', partial: 'status-partial' };
  const labels: Record<string, string> = { paid: 'Payée', unpaid: 'Impayée', partial: 'Partielle' };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
