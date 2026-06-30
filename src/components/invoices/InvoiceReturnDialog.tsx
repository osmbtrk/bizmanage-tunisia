import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { returnsApi, productsApi, stockMovementsApi, documentsApi, invoicesApi } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const REASONS = [
  'Produit défectueux / corrompu',
  'Erreur de commande',
  'Qualité insatisfaisante',
  'Produit endommagé à la livraison',
  'Autre',
];

const formatTND = (n: number) => n.toFixed(3) + ' TND';

interface ItemRow {
  id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onDone?: () => void;
}

export default function InvoiceReturnDialog({ open, onOpenChange, invoice, onDone }: Props) {
  const { companyId } = useAuth();
  const { company, refresh } = useData();
  const { isAdmin } = useRoleAccess();

  const items = (invoice?.items ?? []) as ItemRow[];
  const [selected, setSelected] = useState<Record<number, { qty: number; checked: boolean }>>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deadlineDays = (company as any)?.return_deadline_days ?? 15;
  const daysSince = useMemo(() => {
    if (!invoice?.date) return 0;
    return Math.floor((Date.now() - new Date(invoice.date).getTime()) / 86400000);
  }, [invoice]);
  const overDeadline = daysSince > deadlineDays;
  const blocked = overDeadline && !isAdmin;

  const toggleAll = (full: boolean) => {
    const next: Record<number, { qty: number; checked: boolean }> = {};
    items.forEach((it, idx) => { next[idx] = { qty: it.quantity, checked: full }; });
    setSelected(next);
  };

  const toRefund = useMemo(() => {
    let total = 0;
    items.forEach((it, idx) => {
      const s = selected[idx];
      if (s?.checked && s.qty > 0) {
        total += s.qty * Number(it.unit_price) * (1 + Number(it.tva_rate) / 100);
      }
    });
    return total;
  }, [selected, items]);

  const selectedCount = Object.values(selected).filter(s => s?.checked && s.qty > 0).length;
  const isFullReturn = selectedCount === items.length && items.every((it, idx) => selected[idx]?.qty === it.quantity);

  const handleSubmit = async () => {
    if (!companyId) return;
    if (blocked) {
      toast({ title: 'Retour bloqué', description: `Délai dépassé (${deadlineDays} j). Contactez un admin.`, variant: 'destructive' });
      return;
    }
    const finalReason = reason === 'Autre' ? customReason.trim() : reason;
    if (!finalReason) {
      toast({ title: 'Raison requise', variant: 'destructive' });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: 'Sélectionner au moins un produit', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: creditNum } = await documentsApi.getNextDocumentNumber(companyId, 'avoir');
      const returnType = isDamaged ? 'damaged' : 'reusable';

      for (let idx = 0; idx < items.length; idx++) {
        const s = selected[idx];
        const it = items[idx];
        if (!s?.checked || s.qty <= 0) continue;

        const refund = s.qty * Number(it.unit_price) * (1 + Number(it.tva_rate) / 100);

        await returnsApi.insertReturn({
          company_id: companyId,
          invoice_id: invoice.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: s.qty,
          reason: finalReason,
          return_type: returnType,
          credit_note_number: (creditNum as string) || undefined,
          refund_amount: refund,
        } as any);

        if (it.product_id) {
          if (returnType === 'reusable') {
            await productsApi.adjustStock(it.product_id, s.qty);
          }
          await stockMovementsApi.insertStockMovement({
            company_id: companyId,
            product_id: it.product_id,
            product_name: it.product_name,
            type: 'in',
            quantity: s.qty,
            reason: returnType === 'reusable'
              ? `Retour ${invoice.number} (${finalReason})`
              : `Retour DÉFECTUEUX ${invoice.number} — non restocké (${finalReason})`,
          });
        }
      }

      // ── Recalculate invoice items + totals ──
      // Build the new item list after subtracting returned quantities.
      const updatedItems = items.map((it: any, idx: number) => {
        const s = selected[idx];
        const removed = s?.checked ? Math.min(s.qty, Number(it.quantity)) : 0;
        return { ...it, newQty: Number(it.quantity) - removed };
      });

      for (const it of updatedItems) {
        if (!it.id) continue;
        if (it.newQty <= 0) {
          await invoicesApi.deleteInvoiceItem(it.id);
        } else if (it.newQty !== Number(it.quantity)) {
          await invoicesApi.updateInvoiceItem(it.id, {
            quantity: it.newQty,
            total: it.newQty * Number(it.unit_price),
          });
        }
      }

      const remaining = updatedItems.filter((it: any) => it.newQty > 0);
      const newSubtotal = remaining.reduce((s: number, it: any) => s + it.newQty * Number(it.unit_price), 0);
      const newTvaTotal = remaining.reduce((s: number, it: any) => s + (it.newQty * Number(it.unit_price) * Number(it.tva_rate)) / 100, 0);
      const newTotal = newSubtotal + newTvaTotal;

      // Keep paid_amount but cap at the new total to keep remaining balance coherent.
      const currentPaid = Number(invoice.paid_amount) || 0;
      const newPaid = Math.min(currentPaid, newTotal);

      let newStatus = invoice.status;
      if (isFullReturn || remaining.length === 0) {
        newStatus = 'returned';
      } else if (newPaid >= newTotal && newTotal > 0) {
        newStatus = 'paid';
      } else if (newPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }

      await invoicesApi.updateInvoiceTotals(invoice.id, {
        subtotal: newSubtotal,
        tva_total: newTvaTotal,
        total: newTotal,
        status: newStatus,
        paid_amount: newPaid,
      });

      toast({
        title: 'Retour enregistré',
        description: `Avoir ${creditNum || ''} — ${formatTND(toRefund)}. Facture mise à jour: ${formatTND(newTotal)}`,
      });
      onOpenChange(false);
      setSelected({});
      setReason(REASONS[0]);
      setIsDamaged(false);
      refresh();
      onDone?.();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" /> Retour produit — {invoice?.number}
          </DialogTitle>
        </DialogHeader>

        {overDeadline && (
          <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${blocked ? 'border-destructive/50 bg-destructive/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Délai de retour dépassé ({daysSince} j / {deadlineDays} j max)</p>
              <p className="text-xs">{blocked ? 'Seul un administrateur peut forcer ce retour.' : 'Vous êtes admin — vous pouvez forcer le retour.'}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{selectedCount} / {items.length} produit(s) sélectionné(s)</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(false)}>Tout désélectionner</Button>
            <Button type="button" variant="default" size="sm" onClick={() => toggleAll(true)}>Retourner toute la facture</Button>
          </div>
        </div>

        <div className="rounded-lg border border-border divide-y">
          {items.map((it, idx) => {
            const s = selected[idx] || { qty: it.quantity, checked: false };
            return (
              <div key={idx} className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={s.checked}
                  onCheckedChange={v => setSelected(prev => ({ ...prev, [idx]: { qty: prev[idx]?.qty ?? it.quantity, checked: v === true } }))}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground">PU: {formatTND(Number(it.unit_price))} · Acheté: {it.quantity}</p>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min={1}
                    max={it.quantity}
                    value={s.qty}
                    disabled={!s.checked}
                    onChange={e => {
                      const q = Math.max(1, Math.min(it.quantity, Number(e.target.value) || 1));
                      setSelected(prev => ({ ...prev, [idx]: { qty: q, checked: prev[idx]?.checked ?? false } }));
                    }}
                  />
                </div>
              </div>
            );
          })}
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
            <Input className="mt-2" placeholder="Préciser..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="ret-damaged" checked={isDamaged} onCheckedChange={v => setIsDamaged(v === true)} />
          <label htmlFor="ret-damaged" className="text-sm">Produits défectueux / corrompus (ne pas restocker)</label>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Montant total de l'avoir</p>
          <p className="text-2xl font-bold">{formatTND(toRefund)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isDamaged ? '⚠️ Le stock ne sera PAS augmenté' : '✅ Le stock sera augmenté'}
            {isFullReturn && ' · Facture marquée comme retournée'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedCount === 0 || blocked}>
            {submitting ? 'Enregistrement...' : 'Valider le retour'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
