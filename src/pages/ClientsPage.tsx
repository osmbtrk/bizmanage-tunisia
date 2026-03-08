import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Users, Eye, Pencil, Archive, DollarSign } from 'lucide-react';
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
    if (editId) {
      await updateClient(editId, {
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
      });
    } else {
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
    }
    setForm({ ...emptyForm });
    setEditId(null);
    setOpen(false);
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
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditId(null); setForm({ ...emptyForm }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Modifier le client' : 'Ajouter un client'}</DialogTitle></DialogHeader>
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
              <Button type="submit" className="w-full">{editId ? 'Mettre à jour' : 'Enregistrer'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Client detail dialog */}
      <Dialog open={!!viewId} onOpenChange={o => { if (!o) setViewId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewClient && (
            <>
              <DialogHeader><DialogTitle>{viewClient.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {viewClient.legal_form && <div><span className="text-muted-foreground">Forme juridique:</span> {LEGAL_FORMS.find(l => l.value === viewClient.legal_form)?.label}</div>}
                  {viewClient.matricule_fiscal && <div><span className="text-muted-foreground">Mat. fiscal:</span> {viewClient.matricule_fiscal}</div>}
                  {viewClient.code_tva && <div><span className="text-muted-foreground">Code TVA:</span> {viewClient.code_tva}</div>}
                  {viewClient.phone && <div><span className="text-muted-foreground">Tél:</span> {viewClient.phone}</div>}
                  {viewClient.email && <div><span className="text-muted-foreground">Email:</span> {viewClient.email}</div>}
                  {viewClient.governorate && <div><span className="text-muted-foreground">Gouvernorat:</span> {viewClient.governorate}</div>}
                  {viewClient.contact_person && <div><span className="text-muted-foreground">Contact:</span> {viewClient.contact_person}</div>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground">CA total</p>
                    <p className="text-lg font-bold">{formatDT(clientRevenue)}</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground">Impayés</p>
                    <p className="text-lg font-bold text-destructive">{formatDT(clientUnpaid)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Historique des factures</h4>
                  {clientInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune facture</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                          <div>
                            <span className="font-medium">{inv.number}</span>
                            <span className="text-muted-foreground ml-2">{new Date(inv.date).toLocaleDateString('fr-TN')}</span>
                          </div>
                          <span className="font-semibold">{formatDT(inv.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => (
            <div key={client.id} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{client.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      client.status === 'active' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'
                    }`}>{client.status === 'active' ? 'Actif' : 'Inactif'}</span>
                  </div>
                  {client.matricule_fiscal && <p className="text-xs text-muted-foreground mt-0.5">MF: {client.matricule_fiscal}</p>}
                  {client.phone && <p className="text-sm text-muted-foreground mt-1">{client.phone}</p>}
                  {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setViewId(client.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(client)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(client.id)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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
