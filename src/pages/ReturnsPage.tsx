import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import * as returnsApi from '@/services/api/returns';
import { productsApi, stockMovementsApi, documentsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, RotateCcw, Package } from 'lucide-react';

const formatTND = (n: number) => n.toFixed(3) + ' TND';

const REASONS = [
  'Produit défectueux / corrompu',
  'Erreur de commande',
  'Qualité insatisfaisante',
  'Produit endommagé à la livraison',
  'Autre',
];

export default function ReturnsPage() {
  const { companyId } = useAuth();
  const { invoices, products, refresh: refreshData } = useData();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const factures = invoices.filter(i => i.type === 'facture');

  const selectedInvoice = factures.find(i => i.id === selectedInvoiceId);
  const invoiceItems = selectedInvoice?.items || [];
  const selectedItem = invoiceItems.find(i => i.product_id === selectedProductId);

  const loadReturns = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await returnsApi.fetchReturns(companyId);
    setReturns(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedInvoiceId || !selectedProductId || !selectedItem) return;

    const finalReason = reason === 'Autre' ? customReason : reason;
    if (!finalReason.trim()) {
      toast({ title: 'Raison requise', variant: 'destructive' });
      return;
    }

    if (quantity > selectedItem.quantity) {
      toast({ title: 'Quantité invalide', description: `Max: ${selectedItem.quantity}`, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const returnType = isDamaged ? 'damaged' : 'reusable';
      const refundAmount = quantity * Number(selectedItem.unit_price) * (1 + Number(selectedItem.tva_rate) / 100);

      // Generate credit note number
      const { data: creditNum } = await documentsApi.getNextDocumentNumber(companyId, 'avoir');

      const { error } = await returnsApi.insertReturn({
        company_id: companyId,
        invoice_id: selectedInvoiceId,
        product_id: selectedProductId,
        product_name: selectedItem.product_name,
        quantity,
        reason: finalReason,
        return_type: returnType,
        credit_note_number: (creditNum as string) || undefined,
        refund_amount: refundAmount,
      });

      if (error) throw error;

      // If reusable, increase stock back
      if (returnType === 'reusable') {
        await productsApi.adjustStock(selectedProductId, quantity);
        await stockMovementsApi.insertStockMovement({
          company_id: companyId,
          product_id: selectedProductId,
          product_name: selectedItem.product_name,
          type: 'in',
          quantity,
          reason: `Retour produit — ${selectedInvoice?.number || ''} (${finalReason})`,
        });
      } else {
        // Damaged — record stock movement as 'in' type but with damaged label for tracking
        await stockMovementsApi.insertStockMovement({
          company_id: companyId,
          product_id: selectedProductId,
          product_name: selectedItem.product_name,
          type: 'in',
          quantity,
          reason: `Retour DÉFECTUEUX (non restocké) — ${selectedInvoice?.number || ''} (${finalReason})`,
        });
      }

      toast({ title: 'Retour enregistré', description: `Avoir ${creditNum || ''} — ${formatTND(refundAmount)}` });
      setDialogOpen(false);
      setSelectedInvoiceId('');
      setSelectedProductId('');
      setQuantity(1);
      setReason(REASONS[0]);
      setIsDamaged(false);
      loadReturns();
      refreshData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalRefunds = returns.reduce((s: number, r: any) => s + Number(r.refund_amount), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Retours Produits</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau retour
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total retours</p>
          <p className="text-2xl font-bold">{returns.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Montant avoirs</p>
          <p className="text-2xl font-bold text-destructive">{formatTND(totalRefunds)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Produits défectueux</p>
          <p className="text-2xl font-bold">{returns.filter((r: any) => r.return_type === 'damaged').length}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Chargement...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RotateCcw className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Aucun retour enregistré</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avoir</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.credit_note_number || '—'}</TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                  <TableCell>
                    <Badge variant={r.return_type === 'damaged' ? 'destructive' : 'default'}>
                      {r.return_type === 'damaged' ? 'Défectueux' : 'Restocké'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatTND(Number(r.refund_amount))}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString('fr-TN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau retour produit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Facture *</Label>
              <Select value={selectedInvoiceId} onValueChange={v => { setSelectedInvoiceId(v); setSelectedProductId(''); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                <SelectContent>
                  {factures.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.number} — {f.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoice && (
              <div>
                <Label>Produit *</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                  <SelectContent>
                    {invoiceItems.filter(i => i.product_id).map(i => (
                      <SelectItem key={i.product_id!} value={i.product_id!}>
                        {i.product_name} (Qté: {i.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedItem && (
              <>
                <div>
                  <Label>Quantité à retourner (max: {selectedItem.quantity})</Label>
                  <Input type="number" min={1} max={selectedItem.quantity} value={quantity} onChange={e => setQuantity(+e.target.value)} />
                </div>

                <div>
                  <Label>Raison *</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {reason === 'Autre' && (
                    <Input className="mt-2" placeholder="Préciser la raison..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="damaged"
                    checked={isDamaged}
                    onCheckedChange={v => setIsDamaged(v === true)}
                  />
                  <label htmlFor="damaged" className="text-sm">
                    Produit défectueux / corrompu (ne pas restocker)
                  </label>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Montant de l'avoir :</p>
                  <p className="text-lg font-bold">
                    {formatTND(quantity * Number(selectedItem.unit_price) * (1 + Number(selectedItem.tva_rate) / 100))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDamaged ? '⚠️ Le stock ne sera PAS augmenté' : '✅ Le stock sera augmenté'}
                  </p>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting || !selectedItem}>
              {submitting ? 'Enregistrement...' : 'Enregistrer le retour'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
