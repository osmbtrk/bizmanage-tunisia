import { useState, useMemo, useEffect } from 'react';
import { useData, type DocumentType } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, FileText, Download, Calendar, Eye, ArrowRightLeft } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { generateInvoicePdf } from '@/lib/generatePdf';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { Trash2 } from 'lucide-react';
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

  const showFiltering = docType === 'facture' || docType === 'devis';

  // Auto-expire devis
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

    if (showFiltering && period !== 'all') {
      const range = getDateRange(period, customStart, customEnd);
      if (range) {
        list = list.filter(i => isWithinInterval(new Date(i.date), range));
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, docType, search, period, customStart, customEnd, showFiltering]);

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

      {showFiltering && (
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
            <div key={inv.id} className="stat-card cursor-pointer transition-all duration-200 hover:shadow-md" onClick={() => setDetailInvoice(inv)}>
              <div className="flex items-center justify-between">
                <div>
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
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDetailInvoice(inv); }} className="text-muted-foreground hover:text-primary" title="Voir détails">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {docType === 'facture' && inv.status !== 'paid' && (
                    <div onClick={e => e.stopPropagation()}>
                      <Select value={inv.status} onValueChange={v => updateInvoiceStatus(inv.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Payée</SelectItem>
                          <SelectItem value="partial">Partielle</SelectItem>
                          <SelectItem value="unpaid">Impayée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {docType === 'devis' && getEffectiveStatus(inv) !== 'accepté' && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); setConvertTarget(inv); }} title="Convertir en facture">
                      <ArrowRightLeft className="h-3 w-3" /> Facture
                    </Button>
                  )}
                  {docType === 'devis' && getEffectiveStatus(inv) !== 'accepté' && (
                    <div onClick={e => e.stopPropagation()}>
                      <Select value={getEffectiveStatus(inv)} onValueChange={v => updateInvoiceStatus(inv.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brouillon">Brouillon</SelectItem>
                          <SelectItem value="envoyé">Envoyé</SelectItem>
                          <SelectItem value="accepté">Accepté</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); generateInvoicePdf({ ...inv, clientName: inv.client_name, subtotal: inv.subtotal, tvaTotal: inv.tva_total, paidAmount: inv.paid_amount }, company); }} className="text-muted-foreground hover:text-accent" title="Télécharger PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(inv.id); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Invoice Detail Dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={o => { if (!o) setDetailInvoice(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  {detailInvoice.number}
                  <StatusBadge status={detailInvoice.status} />
                </DialogTitle>
              </DialogHeader>
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
                  <Button variant="outline" className="flex-1" onClick={() => generateInvoicePdf({ ...detailInvoice, clientName: detailInvoice.client_name, subtotal: detailInvoice.subtotal, tvaTotal: detailInvoice.tva_total, paidAmount: detailInvoice.paid_amount }, company)}>
                    <Download className="h-4 w-4 mr-2" /> Télécharger PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
