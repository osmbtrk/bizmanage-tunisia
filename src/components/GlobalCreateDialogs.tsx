import { useState } from 'react';
import { useData, type DocumentType } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export type GlobalDialogType = 'facture' | 'devis' | 'client' | 'product' | null;

interface GlobalCreateDialogsProps {
  openDialog: GlobalDialogType;
  onClose: () => void;
}

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte',
  'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
  'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine',
  'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

const LEGAL_FORMS = [
  { value: 'personne_physique', label: 'Personne physique' },
  { value: 'suarl', label: 'SUARL' },
  { value: 'sarl', label: 'SARL' },
  { value: 'sa', label: 'SA' },
  { value: 'sas', label: 'SAS' },
  { value: 'snc', label: 'SNC' },
  { value: 'autre', label: 'Autre' },
];

export default function GlobalCreateDialogs({ openDialog, onClose }: GlobalCreateDialogsProps) {
  return (
    <>
      <Dialog open={openDialog === 'facture' || openDialog === 'devis'} onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openDialog === 'facture' ? 'Créer une facture' : 'Créer un devis'}
            </DialogTitle>
          </DialogHeader>
          {(openDialog === 'facture' || openDialog === 'devis') && (
            <InvoiceFormGlobal docType={openDialog === 'facture' ? 'facture' : 'devis'} onClose={onClose} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === 'client'} onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ajouter un client</DialogTitle></DialogHeader>
          {openDialog === 'client' && <ClientFormGlobal onClose={onClose} />}
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === 'product'} onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>
          {openDialog === 'product' && <ProductFormGlobal onClose={onClose} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Invoice / Devis Form ── */
function InvoiceFormGlobal({ docType, onClose }: { docType: DocumentType; onClose: () => void }) {
  const { clients, products, company, addInvoice } = useData();
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
  const formatDT = (n: number) => n.toFixed(3) + ' TND';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;

    if (docType === 'facture') {
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
    await addInvoice({
      type: docType, date, due_date: dueDate || undefined,
      client_id: clientId, client_name: selectedClient?.name || '',
      items, status: 'unpaid', paid_amount: 0,
      payment_terms: paymentTerms, notes,
    });
    setSubmitting(false);
    onClose();
  };

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

      <Button type="submit" className="w-full" disabled={!clientId || items.length === 0 || submitting}>
        {submitting ? 'Création...' : 'Créer le document'}
      </Button>
    </form>
  );
}

/* ── Client Form ── */
function ClientFormGlobal({ onClose }: { onClose: () => void }) {
  const { addClient } = useData();
  const [form, setForm] = useState({
    name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', contact_person: '',
    payment_terms: 'Paiement à 30 jours', status: 'active' as string,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addClient({
      name: form.name,
      legal_form: form.legal_form as any,
      matricule_fiscal: form.matricule_fiscal || null,
      code_tva: form.code_tva || null,
      rne: form.rne || null,
      address: form.address || null,
      governorate: form.governorate || null,
      phone: form.phone || null,
      email: form.email || null,
      contact_person: form.contact_person || null,
      payment_terms: form.payment_terms || null,
      status: form.status as any,
      is_archived: false,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Raison sociale *</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div>
          <Label>Forme juridique</Label>
          <Select value={form.legal_form} onValueChange={v => setForm(f => ({ ...f, legal_form: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Matricule fiscal</Label><Input value={form.matricule_fiscal} onChange={e => setForm(f => ({ ...f, matricule_fiscal: e.target.value }))} /></div>
        <div><Label>Code TVA</Label><Input value={form.code_tva} onChange={e => setForm(f => ({ ...f, code_tva: e.target.value }))} /></div>
        <div className="col-span-2"><Label>RNE</Label><Input value={form.rne} onChange={e => setForm(f => ({ ...f, rne: e.target.value }))} /></div>
        <div className="col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
        <div>
          <Label>Gouvernorat</Label>
          <Select value={form.governorate} onValueChange={v => setForm(f => ({ ...f, governorate: v }))}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>{GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label>Personne de contact</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
        <div className="col-span-2"><Label>Conditions de paiement</Label><Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
      </div>
      <Button type="submit" className="w-full">Enregistrer</Button>
    </form>
  );
}

/* ── Product Form ── */
function ProductFormGlobal({ onClose }: { onClose: () => void }) {
  const { addProduct } = useData();
  const [form, setForm] = useState({
    name: '', description: '', purchase_price: 0, selling_price: 0,
    tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(form as any);
    onClose();
  };

  return (
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
  );
}
