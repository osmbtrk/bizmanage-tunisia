import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
} from '@heroui/react';
import { useData, type DocumentType } from '@/contexts/DataContext';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const isInvoice = openDialog === 'facture' || openDialog === 'devis';

  return (
    <>
      <Modal isDismissable={false}
        isOpen={isInvoice}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
        backdrop="opaque"
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>
                {openDialog === 'facture' ? 'Créer une facture' : 'Créer un devis'}
              </ModalHeader>
              <ModalBody className="pb-6">
                {isInvoice && (
                  <InvoiceFormGlobal
                    docType={openDialog === 'facture' ? 'facture' : 'devis'}
                    onClose={close}
                  />
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isDismissable={false}
        isOpen={openDialog === 'client'}
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Ajouter un client</ModalHeader>
              <ModalBody className="pb-6">
                <ClientFormGlobal onClose={close} />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isDismissable={false}
        isOpen={openDialog === 'product'}
        onClose={onClose}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Ajouter un produit</ModalHeader>
              <ModalBody className="pb-6">
                <ProductFormGlobal onClose={close} />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
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
  const [markAsPaid, setMarkAsPaid] = useState(false);

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
        toast({
          title: 'Stock insuffisant',
          description: insufficientItems
            .map((i: any) => `${i.name}: ${i.stock} dispo, ${i.requested} demandé`)
            .join(' — '),
          variant: 'destructive',
        });
        return;
      }
    }

    const isPaid = docType === 'facture' && markAsPaid;
    const status = isPaid ? 'paid' : 'unpaid';
    const paidAmount = isPaid ? total : 0;

    setSubmitting(true);
    try {
      await addInvoice({
        type: docType, date, due_date: dueDate || undefined,
        client_id: clientId, client_name: selectedClient?.name || '',
        items, status, paid_amount: paidAmount,
        payment_terms: paymentTerms, notes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Client"
          isRequired
          selectedKeys={clientId ? [clientId] : []}
          onSelectionChange={(keys) => setClientId(Array.from(keys)[0] as string || '')}
          placeholder="Choisir un client"
          variant="bordered"
        >
          {clients.map(c => <SelectItem key={c.id}>{c.name}</SelectItem>)}
        </Select>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} variant="bordered" />
        <Input label="Date d'échéance" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} variant="bordered" />
        <Input label="Conditions de paiement" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} variant="bordered" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Articles</span>
          <Button type="button" variant="bordered" size="sm" onPress={addItem} isDisabled={products.length === 0} startContent={<Plus className="h-3 w-3" />}>
            Ajouter
          </Button>
        </div>
        {products.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez d'abord des produits</p>}
        {items.map((item: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-12 sm:col-span-5">
              <Select
                aria-label="Produit"
                size="sm"
                variant="bordered"
                selectedKeys={item.product_id ? [item.product_id] : []}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  if (v) selectProduct(idx, v);
                }}
              >
                {products.map(p => <SelectItem key={p.id}>{p.name}</SelectItem>)}
              </Select>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Input aria-label="Quantité" size="sm" type="number" min={1} variant="bordered" value={String(item.quantity)} onChange={e => updateItem(idx, { quantity: +e.target.value })} />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input aria-label="Prix unitaire" size="sm" type="number" step="0.001" variant="bordered" value={String(item.unit_price)} onChange={e => updateItem(idx, { unit_price: +e.target.value })} />
            </div>
            <div className="col-span-3 sm:col-span-2 text-xs text-right font-medium">{formatDT(item.quantity * item.unit_price)}</div>
            <div className="col-span-2 sm:col-span-1 flex justify-end">
              <Button type="button" isIconOnly variant="light" size="sm" onPress={() => removeItem(idx)}>
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
        <div className="bg-secondary/40 rounded-lg p-3">
          <Checkbox isSelected={markAsPaid} onValueChange={setMarkAsPaid}>
            Marquer comme payée
          </Checkbox>
        </div>
      )}

      <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} variant="bordered" />

      <Button
        type="submit"
        color="primary"
        className="w-full"
        isDisabled={!clientId || items.length === 0 || submitting}
        isLoading={submitting}
      >
        {submitting ? 'Création...' : 'Créer le document'}
      </Button>
    </form>
  );
}

/* ── Client Form ── */
function ClientFormGlobal({ onClose }: { onClose: () => void }) {
  const { addClient } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', contact_person: '',
    payment_terms: 'Paiement à 30 jours', status: 'active' as string,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Input label="Raison sociale" isRequired variant="bordered" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <Select
          label="Forme juridique"
          variant="bordered"
          selectedKeys={[form.legal_form]}
          onSelectionChange={(keys) => setForm(f => ({ ...f, legal_form: Array.from(keys)[0] as string }))}
        >
          {LEGAL_FORMS.map(lf => <SelectItem key={lf.value}>{lf.label}</SelectItem>)}
        </Select>
        <Select
          label="Statut"
          variant="bordered"
          selectedKeys={[form.status]}
          onSelectionChange={(keys) => setForm(f => ({ ...f, status: Array.from(keys)[0] as string }))}
        >
          <SelectItem key="active">Actif</SelectItem>
          <SelectItem key="inactive">Inactif</SelectItem>
        </Select>
        <Input label="Matricule fiscal" variant="bordered" value={form.matricule_fiscal} onChange={e => setForm(f => ({ ...f, matricule_fiscal: e.target.value }))} />
        <Input label="Code TVA" variant="bordered" value={form.code_tva} onChange={e => setForm(f => ({ ...f, code_tva: e.target.value }))} />
        <div className="sm:col-span-2">
          <Input label="RNE" variant="bordered" value={form.rne} onChange={e => setForm(f => ({ ...f, rne: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Adresse" variant="bordered" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <Select
          label="Gouvernorat"
          variant="bordered"
          selectedKeys={form.governorate ? [form.governorate] : []}
          onSelectionChange={(keys) => setForm(f => ({ ...f, governorate: Array.from(keys)[0] as string || '' }))}
          placeholder="Choisir..."
        >
          {GOVERNORATES.map(g => <SelectItem key={g}>{g}</SelectItem>)}
        </Select>
        <Input label="Téléphone" variant="bordered" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label="Email" type="email" variant="bordered" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Input label="Personne de contact" variant="bordered" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
        <div className="sm:col-span-2">
          <Input label="Conditions de paiement" variant="bordered" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
        </div>
      </div>
      <Button type="submit" color="primary" className="w-full" isLoading={submitting}>Enregistrer</Button>
    </form>
  );
}

/* ── Product Form ── */
function ProductFormGlobal({ onClose }: { onClose: () => void }) {
  const { addProduct, categories } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', purchase_price: 0, selling_price: 0,
    tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
    product_type: 'finished_product' as string, category_type: 'normal' as string,
    supplier_id: null as string | null, category_id: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addProduct({
        ...form,
        description: form.description || null,
        product_type: form.product_type as any,
        category_type: form.category_type as any,
      } as any);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Nom" isRequired variant="bordered" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input label="Description" variant="bordered" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      {categories.length > 0 && (
        <Select
          label="Catégorie"
          variant="bordered"
          selectedKeys={form.category_id ? [form.category_id] : ['_none']}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            setForm(f => ({ ...f, category_id: v === '_none' ? null : v }));
          }}
        >
          {[
            <SelectItem key="_none">Aucune</SelectItem>,
            ...categories.map(c => <SelectItem key={c.id}>{c.name}</SelectItem>),
          ]}
        </Select>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Prix d'achat (TND)" type="number" step="0.001" min={0} variant="bordered" value={String(form.purchase_price)} onChange={e => setForm(f => ({ ...f, purchase_price: +e.target.value }))} />
        <Input label="Prix de vente (TND)" type="number" step="0.001" min={0} variant="bordered" value={String(form.selling_price)} onChange={e => setForm(f => ({ ...f, selling_price: +e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="TVA %"
          variant="bordered"
          selectedKeys={[String(form.tva_rate)]}
          onSelectionChange={(keys) => setForm(f => ({ ...f, tva_rate: +(Array.from(keys)[0] as string) }))}
        >
          <SelectItem key="0">0%</SelectItem>
          <SelectItem key="7">7%</SelectItem>
          <SelectItem key="13">13%</SelectItem>
          <SelectItem key="19">19%</SelectItem>
        </Select>
        <Input label="Stock initial" type="number" min={0} variant="bordered" value={String(form.stock)} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} />
        <Input label="Stock min" type="number" min={0} variant="bordered" value={String(form.min_stock)} onChange={e => setForm(f => ({ ...f, min_stock: +e.target.value }))} />
      </div>
      <Input label="Unité" variant="bordered" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
      <Button type="submit" color="primary" className="w-full" isLoading={submitting}>Enregistrer</Button>
    </form>
  );
}
