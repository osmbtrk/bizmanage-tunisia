import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Card,
  CardBody,
  Chip,
} from '@heroui/react';
import { Plus, Search, Users, Eye, Pencil, Archive } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

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

const emptyForm = {
  name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
  address: '', governorate: '', phone: '', email: '', contact_person: '',
  payment_terms: 'Paiement à 30 jours', status: 'active' as string,
};

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient, invoices } = useData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.matricule_fiscal?.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
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
      };
      if (editId) {
        await updateClient(editId, payload);
      } else {
        await addClient({ ...payload, is_archived: false } as any);
      }
      setForm({ ...emptyForm });
      setEditId(null);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (client: typeof clients[0]) => {
    setEditId(client.id);
    setForm({
      name: client.name,
      legal_form: client.legal_form || 'personne_physique',
      matricule_fiscal: client.matricule_fiscal || '',
      code_tva: client.code_tva || '',
      rne: client.rne || '',
      address: client.address || '',
      governorate: client.governorate || '',
      phone: client.phone || '',
      email: client.email || '',
      contact_person: client.contact_person || '',
      payment_terms: client.payment_terms || '',
      status: client.status || 'active',
    });
    setOpen(true);
  };

  const viewClient = clients.find(c => c.id === viewId);
  const clientInvoices = viewClient ? invoices.filter(i => i.client_id === viewClient.id) : [];
  const clientUnpaid = clientInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.paid_amount), 0);
  const clientRevenue = clientInvoices.filter(i => i.type === 'facture').reduce((s, i) => s + i.total, 0);

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Gestion des clients</h1>
        <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); }}>
          Nouveau client
        </Button>
      </div>

      <Modal
        isDismissable={false}
        isOpen={open}
        onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm({ ...emptyForm }); } }}
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader>{editId ? 'Modifier le client' : 'Ajouter un client'}</ModalHeader>
          <ModalBody className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Input label="Raison sociale" labelPlacement="outside" placeholder="Nom" isRequired value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} />
                </div>
                <Select
                  label="Forme juridique"
                  labelPlacement="outside"
                  placeholder="Choisir..."
                  selectedKeys={[form.legal_form]}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as string;
                    if (v) setForm(f => ({ ...f, legal_form: v }));
                  }}
                >
                  {LEGAL_FORMS.map(lf => <SelectItem key={lf.value}>{lf.label}</SelectItem>)}
                </Select>
                <Select
                  label="Statut"
                  labelPlacement="outside"
                  selectedKeys={[form.status]}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as string;
                    if (v) setForm(f => ({ ...f, status: v }));
                  }}
                >
                  <SelectItem key="active">Actif</SelectItem>
                  <SelectItem key="inactive">Inactif</SelectItem>
                </Select>
                <Input label="Matricule fiscal" labelPlacement="outside" value={form.matricule_fiscal} onValueChange={v => setForm(f => ({ ...f, matricule_fiscal: v }))} />
                <Input label="Code TVA" labelPlacement="outside" value={form.code_tva} onValueChange={v => setForm(f => ({ ...f, code_tva: v }))} />
                <div className="sm:col-span-2">
                  <Input label="RNE" labelPlacement="outside" value={form.rne} onValueChange={v => setForm(f => ({ ...f, rne: v }))} />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Adresse" labelPlacement="outside" value={form.address} onValueChange={v => setForm(f => ({ ...f, address: v }))} />
                </div>
                <Select
                  label="Gouvernorat"
                  labelPlacement="outside"
                  placeholder="Choisir..."
                  selectedKeys={form.governorate ? [form.governorate] : []}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as string;
                    setForm(f => ({ ...f, governorate: v || '' }));
                  }}
                >
                  {GOVERNORATES.map(g => <SelectItem key={g}>{g}</SelectItem>)}
                </Select>
                <Input label="Téléphone" labelPlacement="outside" value={form.phone} onValueChange={v => setForm(f => ({ ...f, phone: v }))} />
                <Input label="Email" labelPlacement="outside" type="email" value={form.email} onValueChange={v => setForm(f => ({ ...f, email: v }))} />
                <Input label="Personne de contact" labelPlacement="outside" value={form.contact_person} onValueChange={v => setForm(f => ({ ...f, contact_person: v }))} />
                <div className="sm:col-span-2">
                  <Input label="Conditions de paiement" labelPlacement="outside" value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))} />
                </div>
              </div>
              <Button type="submit" color="primary" className="w-full" isLoading={submitting}>
                {editId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Input
        placeholder="Rechercher un client..."
        startContent={<Search className="h-4 w-4 text-muted-foreground" />}
        value={search}
        onValueChange={setSearch}
        variant="bordered"
        className="mb-4"
      />

      <Modal isDismissable={false} isOpen={!!viewId} onOpenChange={(o) => { if (!o) setViewId(null); }} size="2xl" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          {viewClient && (
            <>
              <ModalHeader>{viewClient.name}</ModalHeader>
              <ModalBody className="pb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {viewClient.legal_form && <div><span className="text-muted-foreground">Forme juridique:</span> {LEGAL_FORMS.find(l => l.value === viewClient.legal_form)?.label}</div>}
                  {viewClient.matricule_fiscal && <div><span className="text-muted-foreground">Mat. fiscal:</span> {viewClient.matricule_fiscal}</div>}
                  {viewClient.code_tva && <div><span className="text-muted-foreground">Code TVA:</span> {viewClient.code_tva}</div>}
                  {viewClient.phone && <div><span className="text-muted-foreground">Tél:</span> {viewClient.phone}</div>}
                  {viewClient.email && <div><span className="text-muted-foreground">Email:</span> {viewClient.email}</div>}
                  {viewClient.governorate && <div><span className="text-muted-foreground">Gouvernorat:</span> {viewClient.governorate}</div>}
                  {viewClient.contact_person && <div><span className="text-muted-foreground">Contact:</span> {viewClient.contact_person}</div>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">CA total</p>
                    <p className="text-lg font-bold tabular-nums">{formatDT(clientRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Impayés</p>
                    <p className="text-lg font-bold text-destructive tabular-nums">{formatDT(clientUnpaid)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Historique des factures</h4>
                  {clientInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune facture</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clientInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                          <div>
                            <span className="font-medium">{inv.number}</span>
                            <span className="text-muted-foreground ml-2">{new Date(inv.date).toLocaleDateString('fr-TN')}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{formatDT(inv.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => (
            <Card key={client.id} className="w-full">
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      <Chip size="sm" variant="flat" color={client.status === 'active' ? 'success' : 'default'}>
                        {client.status === 'active' ? 'Actif' : 'Inactif'}
                      </Chip>
                    </div>
                    {client.matricule_fiscal && <p className="text-xs text-muted-foreground mt-0.5">MF: {client.matricule_fiscal}</p>}
                    {client.phone && <p className="text-sm text-muted-foreground mt-1">{client.phone}</p>}
                    {client.email && <p className="text-sm text-muted-foreground truncate">{client.email}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button isIconOnly variant="light" size="sm" onPress={() => setViewId(client.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button isIconOnly variant="light" size="sm" onPress={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => setDeleteTarget(client.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Archiver ce client ?"
        description="Le client sera archivé et n'apparaîtra plus dans la liste."
        confirmLabel="Archiver"
        onConfirm={() => { if (deleteTarget) { deleteClient(deleteTarget); setDeleteTarget(null); } }}
      />
    </div>
  );
}
