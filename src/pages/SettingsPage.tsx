import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Loader2 } from 'lucide-react';

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

export default function SettingsPage() {
  const { company, updateCompany } = useData();
  const { role } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', legal_form: 'sarl' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', website: '', payment_terms: '',
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        legal_form: company.legal_form || 'sarl',
        matricule_fiscal: company.matricule_fiscal || '',
        code_tva: company.code_tva || '',
        rne: company.rne || '',
        address: company.address || '',
        governorate: company.governorate || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        payment_terms: company.payment_terms || '',
      });
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateCompany({
      name: form.name,
      legal_form: form.legal_form as any,
      matricule_fiscal: form.matricule_fiscal || null,
      code_tva: form.code_tva || null,
      rne: form.rne || null,
      address: form.address || null,
      governorate: form.governorate || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      payment_terms: form.payment_terms || null,
    });
    setSaving(false);
  };

  if (role !== 'admin') {
    return (
      <div className="animate-fade-in text-center py-12 text-muted-foreground">
        <Building2 className="mx-auto h-12 w-12 mb-3 opacity-40" />
        <p>Seuls les administrateurs peuvent modifier les paramètres.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Paramètres de l'entreprise</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="stat-card space-y-4">
          <h3 className="font-semibold text-foreground">Informations légales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Raison sociale *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Forme juridique</Label>
              <Select value={form.legal_form} onValueChange={v => setForm(f => ({ ...f, legal_form: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Matricule fiscal</Label>
              <Input value={form.matricule_fiscal} onChange={e => setForm(f => ({ ...f, matricule_fiscal: e.target.value }))} placeholder="0000000/X/X/X/000" />
            </div>
            <div>
              <Label>Code TVA</Label>
              <Input value={form.code_tva} onChange={e => setForm(f => ({ ...f, code_tva: e.target.value }))} />
            </div>
            <div>
              <Label>RNE</Label>
              <Input value={form.rne} onChange={e => setForm(f => ({ ...f, rne: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="stat-card space-y-4">
          <h3 className="font-semibold text-foreground">Coordonnées</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Gouvernorat</Label>
              <Select value={form.governorate} onValueChange={v => setForm(f => ({ ...f, governorate: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="stat-card space-y-4">
          <h3 className="font-semibold text-foreground">Facturation</h3>
          <div>
            <Label>Conditions de paiement par défaut</Label>
            <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="Paiement à 30 jours" />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
