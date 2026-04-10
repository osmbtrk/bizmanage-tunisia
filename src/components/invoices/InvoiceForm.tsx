import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DocumentType } from '@/contexts/DataContext';

interface InvoiceFormProps {
  docType: DocumentType;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; selling_price: number; tva_rate: number; stock: number }[];
  company: any;
  onSubmit: (data: any) => Promise<void>;
}

export default function InvoiceForm({ docType, clients, products, company, onSubmit }: InvoiceFormProps) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(company?.payment_terms || 'Paiement à 30 jours');
  const [submitting, setSubmitting] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(false);

  // Devis status
  const [devisStatus, setDevisStatus] = useState('brouillon');

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
        toast({
          title: '⚠️ Stock insuffisant',
          description: insufficientItems
            .map((i: any) => `${i.name}: ${i.stock} dispo, ${i.requested} demandé`)
            .join(' • '),
          variant: 'destructive',
        });
        return;
      }
    }

    const isPaid = docType === 'facture' && markAsPaid;
    const status = docType === 'devis' ? devisStatus : (isPaid ? 'paid' : 'unpaid');
    const paidAmount = isPaid ? total : 0;

    setSubmitting(true);
    await onSubmit({
      type: docType, date, due_date: dueDate || undefined,
      client_id: clientId, client_name: selectedClient?.name || '',
      items, status, paid_amount: paidAmount,
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

      {docType === 'devis' && (
        <div>
          <Label>Statut du devis</Label>
          <Select value={devisStatus} onValueChange={setDevisStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="envoyé">Envoyé</SelectItem>
              <SelectItem value="accepté">Accepté</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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

      {docType === 'facture' && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
          <Checkbox
            id="markAsPaid"
            checked={markAsPaid}
            onCheckedChange={v => setMarkAsPaid(v === true)}
          />
          <label htmlFor="markAsPaid" className="text-sm font-medium cursor-pointer">
            Marquer comme payée
          </label>
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
