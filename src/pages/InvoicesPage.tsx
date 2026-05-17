import { useState, useMemo, useEffect } from 'react';
import { useData, type DocumentType } from '@/contexts/DataContext';
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
  Checkbox,
  Pagination,
  Tooltip,
} from '@heroui/react';
import { Plus, Search, FileText, Download, Calendar, Eye, ArrowRightLeft, RotateCcw, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceReturnDialog from '@/components/invoices/InvoiceReturnDialog';
import { generateInvoicePdf } from '@/lib/generatePdf';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [convertTarget, setConvertTarget] = useState<any>(null);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [showReturned, setShowReturned] = useState(false);

  const showFiltering = docType === 'facture' || docType === 'devis';

  const getEffectiveStatus = (inv: any) => {
    if (docType === 'devis' && inv.due_date && inv.status !== 'accepté') {
      const dueDate = new Date(inv.due_date);
      if (dueDate < new Date()) return 'expiré';
    }
    return inv.status;
  };

  const filtered = useMemo(() => {
    let list = invoices
      .filter(i => i.type === docType)
      .filter(i => i.number.includes(search) || i.client_name.toLowerCase().includes(search.toLowerCase()));

    if (docType === 'facture' && !showReturned) {
      list = list.filter(i => i.status !== 'returned');
    }

    if (showFiltering && period !== 'all') {
      const range = getDateRange(period, customStart, customEnd);
      if (range) {
        list = list.filter(i => isWithinInterval(new Date(i.date), range));
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, docType, search, period, customStart, customEnd, showFiltering, showReturned]);

  const handleConvertToFacture = async (devis: any) => {
    try {
      await addInvoice({
        type: 'facture',
        date: new Date().toISOString().split('T')[0],
        due_date: devis.due_date,
        client_id: devis.client_id,
        client_name: devis.client_name,
        items: devis.items.map((it: any) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tva_rate: it.tva_rate,
          total: it.total,
        })),
        status: 'unpaid',
        paid_amount: 0,
        payment_terms: devis.payment_terms,
        notes: `Convertie depuis devis ${devis.number}`,
      });
      await updateInvoiceStatus(devis.id, 'accepté');
      toast({ title: 'Devis converti en facture' });
      setConvertTarget(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    }
  };

  const totals = useMemo(() => {
    if (!showFiltering) return null;
    const ht = filtered.reduce((s, i) => s + Number(i.subtotal), 0);
    const tva = filtered.reduce((s, i) => s + Number(i.tva_total), 0);
    const ttc = filtered.reduce((s, i) => s + Number(i.total), 0);
    const unpaid = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);
    return { ht, tva, ttc, unpaid };
  }, [filtered, showFiltering]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [period, customStart, customEnd, search, perPage]);

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
        <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => setOpen(true)}>
          Nouveau
        </Button>
      </div>

      <Modal isDismissable={false}
        isOpen={open}
        onOpenChange={setOpen}
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader>Créer {title.toLowerCase()}</ModalHeader>
          <ModalBody className="pb-6">
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
          </ModalBody>
        </ModalContent>
      </Modal>

      {showFiltering && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {periodButtons.map(pb => (
              <Button
                key={pb.value}
                variant={period === pb.value ? 'solid' : 'bordered'}
                color={period === pb.value ? 'primary' : 'default'}
                size="sm"
                onPress={() => setPeriod(pb.value)}
                startContent={pb.value === 'custom' ? <Calendar className="h-3 w-3" /> : undefined}
              >
                {pb.label}
              </Button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex gap-3 items-end">
              <Input
                type="date"
                label="Du"
                size="sm"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-44"
              />
              <Input
                type="date"
                label="Au"
                size="sm"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-44"
              />
            </div>
          )}

          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card shadow="sm" className="bg-card border border-border">
                <CardBody className="p-3">
                  <p className="text-xs text-muted-foreground">Total HT</p>
                  <p className="text-sm font-bold">{formatDT(totals.ht)}</p>
                </CardBody>
              </Card>
              <Card shadow="sm" className="bg-card border border-border">
                <CardBody className="p-3">
                  <p className="text-xs text-muted-foreground">TVA</p>
                  <p className="text-sm font-bold">{formatDT(totals.tva)}</p>
                </CardBody>
              </Card>
              <Card shadow="sm" className="bg-card border border-border">
                <CardBody className="p-3">
                  <p className="text-xs text-muted-foreground">Total TTC</p>
                  <p className="text-sm font-bold text-primary">{formatDT(totals.ttc)}</p>
                </CardBody>
              </Card>
              <Card shadow="sm" className="bg-card border border-border">
                <CardBody className="p-3">
                  <p className="text-xs text-muted-foreground">Impayés</p>
                  <p className="text-sm font-bold text-destructive">{formatDT(totals.unpaid)}</p>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Rechercher..."
          value={search}
          onValueChange={setSearch}
          startContent={<Search className="h-4 w-4 text-muted-foreground" />}
          className="flex-1"
          variant="bordered"
          size="sm"
        />
        {docType === 'facture' && (
          <Card shadow="none" className="bg-card border border-border">
            <CardBody className="px-3 py-2">
              <Checkbox
                size="sm"
                isSelected={showReturned}
                onValueChange={setShowReturned}
                classNames={{ label: 'text-xs text-muted-foreground' }}
              >
                Afficher les factures retournées
              </Checkbox>
            </CardBody>
          </Card>
        )}
      </div>

      {paginated.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(inv => (
            <Card
              key={inv.id}
              isPressable
              onPress={() => setDetailInvoice(inv)}
              shadow="sm"
              className="bg-card border border-border w-full"
            >
              <CardBody className="p-4">
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inv.number}</span>
                      <StatusBadge status={getEffectiveStatus(inv)} />
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
                    <Tooltip content="Voir détails">
                      <Button isIconOnly variant="light" size="sm" onPress={() => setDetailInvoice(inv)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                    {docType === 'facture' && inv.status !== 'paid' && (
                      <div onClick={e => e.stopPropagation()}>
                        <Select
                          aria-label="Statut"
                          size="sm"
                          variant="bordered"
                          selectedKeys={[inv.status]}
                          onSelectionChange={(keys) => {
                            const v = Array.from(keys)[0] as string;
                            if (v) updateInvoiceStatus(inv.id, v);
                          }}
                          className="w-32"
                          classNames={{ trigger: 'h-8 min-h-8' }}
                        >
                          <SelectItem key="paid">Payée</SelectItem>
                          <SelectItem key="partial">Partielle</SelectItem>
                          <SelectItem key="unpaid">Impayée</SelectItem>
                        </Select>
                      </div>
                    )}
                    {docType === 'devis' && getEffectiveStatus(inv) !== 'accepté' && (
                      <Tooltip content="Convertir en facture">
                        <Button
                          variant="bordered"
                          size="sm"
                          startContent={<ArrowRightLeft className="h-3 w-3" />}
                          onPress={() => setConvertTarget(inv)}
                        >
                          Facture
                        </Button>
                      </Tooltip>
                    )}
                    {docType === 'devis' && getEffectiveStatus(inv) !== 'accepté' && (
                      <div onClick={e => e.stopPropagation()}>
                        <Select
                          aria-label="Statut devis"
                          size="sm"
                          variant="bordered"
                          selectedKeys={[getEffectiveStatus(inv)]}
                          onSelectionChange={(keys) => {
                            const v = Array.from(keys)[0] as string;
                            if (v) updateInvoiceStatus(inv.id, v);
                          }}
                          className="w-32"
                          classNames={{ trigger: 'h-8 min-h-8' }}
                        >
                          <SelectItem key="brouillon">Brouillon</SelectItem>
                          <SelectItem key="envoyé">Envoyé</SelectItem>
                          <SelectItem key="accepté">Accepté</SelectItem>
                        </Select>
                      </div>
                    )}
                    <Tooltip content="Télécharger PDF">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => generateInvoicePdf({ ...inv, clientName: inv.client_name, subtotal: inv.subtotal, tvaTotal: inv.tva_total, paidAmount: inv.paid_amount }, company)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Supprimer" color="danger">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        color="danger"
                        onPress={() => setDeleteTarget(inv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Afficher</span>
            <Select
              aria-label="Par page"
              size="sm"
              variant="bordered"
              selectedKeys={[String(perPage)]}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as string;
                if (v) setPerPage(Number(v));
              }}
              className="w-20"
              classNames={{ trigger: 'h-8 min-h-8' }}
            >
              <SelectItem key="10">10</SelectItem>
              <SelectItem key="25">25</SelectItem>
              <SelectItem key="50">50</SelectItem>
            </Select>
            <span className="text-xs text-muted-foreground">sur {filtered.length}</span>
          </div>
          <Pagination
            size="sm"
            total={totalPages}
            page={currentPage}
            onChange={setCurrentPage}
            showControls
          />
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal isDismissable={false}
        isOpen={!!detailInvoice}
        onOpenChange={(o) => { if (!o) setDetailInvoice(null); }}
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          {detailInvoice && (
            <>
              <ModalHeader className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                {detailInvoice.number}
                <StatusBadge status={detailInvoice.status} />
              </ModalHeader>
              <ModalBody className="pb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Client</p>
                      <p className="font-medium mt-1">{detailInvoice.client_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Date</p>
                      <p className="font-medium mt-1">{new Date(detailInvoice.date).toLocaleDateString('fr-TN')}</p>
                    </div>
                    {detailInvoice.due_date && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Échéance</p>
                        <p className="font-medium mt-1">{new Date(detailInvoice.due_date).toLocaleDateString('fr-TN')}</p>
                      </div>
                    )}
                    {detailInvoice.payment_terms && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Conditions</p>
                        <p className="font-medium mt-1">{detailInvoice.payment_terms}</p>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-muted-foreground">
                          <th className="text-left p-3 font-medium">Produit</th>
                          <th className="text-right p-3 font-medium">Qté</th>
                          <th className="text-right p-3 font-medium">P.U.</th>
                          <th className="text-right p-3 font-medium">TVA</th>
                          <th className="text-right p-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailInvoice.items?.map((item: any, i: number) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-3 font-medium">{item.product_name}</td>
                            <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                            <td className="p-3 text-right tabular-nums">{Number(item.unit_price).toFixed(3)}</td>
                            <td className="p-3 text-right tabular-nums">{item.tva_rate}%</td>
                            <td className="p-3 text-right tabular-nums font-medium">{formatDT(item.quantity * Number(item.unit_price))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1 text-sm border-t border-border pt-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span className="tabular-nums">{formatDT(detailInvoice.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span className="tabular-nums">{formatDT(detailInvoice.tva_total)}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2"><span>Total TTC</span><span className="tabular-nums">{formatDT(detailInvoice.total)}</span></div>
                    {detailInvoice.paid_amount > 0 && detailInvoice.status !== 'paid' && (
                      <div className="flex justify-between text-muted-foreground"><span>Montant payé</span><span className="tabular-nums">{formatDT(detailInvoice.paid_amount)}</span></div>
                    )}
                  </div>

                  {detailInvoice.notes && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{detailInvoice.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="bordered"
                      className="flex-1"
                      startContent={<Download className="h-4 w-4" />}
                      onPress={() => generateInvoicePdf({ ...detailInvoice, clientName: detailInvoice.client_name, subtotal: detailInvoice.subtotal, tvaTotal: detailInvoice.tva_total, paidAmount: detailInvoice.paid_amount }, company)}
                    >
                      Télécharger PDF
                    </Button>
                    {docType === 'facture' && detailInvoice.status !== 'returned' && (
                      <Button
                        color="primary"
                        className="flex-1"
                        startContent={<RotateCcw className="h-4 w-4" />}
                        onPress={() => setReturnTarget(detailInvoice)}
                      >
                        Retour produit
                      </Button>
                    )}
                  </div>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {returnTarget && (
        <InvoiceReturnDialog
          open={!!returnTarget}
          onOpenChange={o => { if (!o) setReturnTarget(null); }}
          invoice={returnTarget}
          onDone={() => { setReturnTarget(null); setDetailInvoice(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer ce document ?"
        description="Le document sera supprimé définitivement et le stock sera restauré si applicable."
        onConfirm={() => { if (deleteTarget) { deleteInvoice(deleteTarget); setDeleteTarget(null); } }}
      />

      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={(o) => { if (!o) setConvertTarget(null); }}
        title="Convertir ce devis en facture ?"
        description={`Le devis ${convertTarget?.number || ''} sera marqué comme accepté et une nouvelle facture sera créée avec les mêmes articles.`}
        onConfirm={() => { if (convertTarget) handleConvertToFacture(convertTarget); }}
      />
    </div>
  );
}
