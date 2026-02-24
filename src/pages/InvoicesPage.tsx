import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, FileText, Download } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/generatePdf';
import type { DocumentType, InvoiceItem, PaymentStatus, TVARate } from '@/types';

interface InvoicesPageProps {
  docType: DocumentType;
  title: string;
}

export default function InvoicesPage({ docType, title }: InvoicesPageProps) {
  const { invoices, addInvoice, deleteInvoice, updateInvoiceStatus, clients, products } = useData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = invoices
    .filter(i => i.type === docType)
    .filter(i => i.number.includes(search) || i.clientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

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
              onSubmit={(data) => {
                addInvoice(data);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <div key={inv.id} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{inv.number}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{inv.clientName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString('fr-TN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="font-bold text-lg">{formatDT(inv.total)}</p>
                    {inv.status === 'partial' && (
                      <p className="text-xs text-muted-foreground">Payé: {formatDT(inv.paidAmount)}</p>
                    )}
                  </div>
                  {docType === 'facture' && inv.status !== 'paid' && (
                    <Select
                      value={inv.status}
                      onValueChange={(v) => updateInvoiceStatus(inv.id, v as PaymentStatus)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Payée</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="unpaid">Impayée</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => generateInvoicePdf(inv)} className="text-muted-foreground hover:text-accent" title="Télécharger PDF">
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
    </div>
  );
}

function InvoiceForm({ docType, clients, products, onSubmit }: {
  docType: DocumentType;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; sellingPrice: number; tvaRate: TVARate }[];
  onSubmit: (data: any) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  const addItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setItems([...items, {
      productId: p.id, productName: p.name,
      quantity: 1, unitPrice: p.sellingPrice, tvaRate: p.tvaRate,
      total: p.sellingPrice,
    }]);
  };

  const updateItem = (idx: number, updates: Partial<InvoiceItem>) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...updates };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const selectProduct = (idx: number, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    updateItem(idx, { productId: p.id, productName: p.name, unitPrice: p.sellingPrice, tvaRate: p.tvaRate });
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tvaTotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.tvaRate) / 100, 0);
  const total = subtotal + tvaTotal;

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;
    onSubmit({
      type: docType,
      date,
      clientId,
      clientName: selectedClient?.name || '',
      items,
      status: 'unpaid' as PaymentStatus,
      paidAmount: 0,
      notes,
    });
  };

  const formatDT = (n: number) => n.toFixed(3) + ' TND';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Articles</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={products.length === 0}>
            <Plus className="mr-1 h-3 w-3" /> Ajouter
          </Button>
        </div>
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez d'abord des produits dans la section Produits</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-5">
              <Select value={item.productId} onValueChange={v => selectProduct(idx, v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input type="number" min={1} className="h-9 text-xs" value={item.quantity}
                onChange={e => updateItem(idx, { quantity: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Input type="number" step="0.001" className="h-9 text-xs" value={item.unitPrice}
                onChange={e => updateItem(idx, { unitPrice: +e.target.value })} />
            </div>
            <div className="col-span-2 text-xs text-right font-medium pt-2">
              {formatDT(item.quantity * item.unitPrice)}
            </div>
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
      <Button type="submit" className="w-full" disabled={!clientId || items.length === 0}>Créer le document</Button>
    </form>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'status-paid', unpaid: 'status-unpaid', partial: 'status-partial',
  };
  const labels: Record<string, string> = {
    paid: 'Payée', unpaid: 'Impayée', partial: 'Partielle',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
