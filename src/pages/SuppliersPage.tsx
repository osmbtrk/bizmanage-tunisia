import { useState, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseInvoicesApi } from '@/services/api';
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Card,
  CardBody,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from '@heroui/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, Trash2, Search, Truck, Eye, FileText, DollarSign, Package, Clock } from 'lucide-react';

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

  const productsSupplied = supplierInvoices.flatMap((inv: any) =>
    (inv.items || []).map((it: any) => ({ name: it.product_name, qty: it.quantity, total: it.quantity * it.unit_price }))
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
        <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => setOpen(true)}>
          Nouveau fournisseur
        </Button>
      </div>

      <Modal isDismissable={false} isOpen={open} onOpenChange={setOpen} size="md" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          <ModalHeader>Ajouter un fournisseur</ModalHeader>
          <ModalBody className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nom" labelPlacement="outside" placeholder="Nom du fournisseur" isRequired value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} />
              <Input label="Adresse" labelPlacement="outside" placeholder="Adresse" value={form.address} onValueChange={v => setForm(f => ({ ...f, address: v }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Téléphone" labelPlacement="outside" placeholder="+216 ..." value={form.phone} onValueChange={v => setForm(f => ({ ...f, phone: v }))} />
                <Input label="Email" labelPlacement="outside" type="email" placeholder="email@..." value={form.email} onValueChange={v => setForm(f => ({ ...f, email: v }))} />
              </div>
              <Input label="Matricule fiscal" labelPlacement="outside" placeholder="MF" value={form.tax_id} onValueChange={v => setForm(f => ({ ...f, tax_id: v }))} />
              <Button type="submit" color="primary" className="w-full" isLoading={submitting}>Enregistrer</Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Input
        placeholder="Rechercher un fournisseur..."
        startContent={<Search className="h-4 w-4 text-muted-foreground" />}
        value={search}
        onValueChange={setSearch}
        variant="bordered"
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun fournisseur trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <Card key={s.id} isPressable onPress={() => loadSupplierHistory(s.id)} className="w-full">
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    {s.phone && <p className="text-sm text-muted-foreground mt-1">{s.phone}</p>}
                    {s.email && <p className="text-sm text-muted-foreground truncate">{s.email}</p>}
                    {s.tax_id && <p className="text-xs text-muted-foreground mt-1">MF: {s.tax_id}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button isIconOnly variant="light" size="sm" onPress={() => loadSupplierHistory(s.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => setDeleteTarget(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isDismissable={false} isOpen={!!selectedSupplier} onOpenChange={(o) => { if (!o) setSelectedSupplier(null); }} size="2xl" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          {selectedSupplierObj && (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {selectedSupplierObj.name} — Historique
              </ModalHeader>
              <ModalBody className="pb-6 space-y-4">
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

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historique des factures</h3>
                  {loadingHistory ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
                  ) : supplierInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucune facture</p>
                  ) : (
                    <Table aria-label="Factures fournisseur" removeWrapper isStriped>
                      <TableHeader>
                        <TableColumn>NUMÉRO</TableColumn>
                        <TableColumn>DATE</TableColumn>
                        <TableColumn align="end">TOTAL</TableColumn>
                        <TableColumn>STATUT</TableColumn>
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
                                <Chip size="sm" variant="flat" color={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'}>
                                  {inv.status === 'paid' ? 'Payée' : inv.status === 'partial' ? 'Partielle' : 'Impayée'}
                                </Chip>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

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
