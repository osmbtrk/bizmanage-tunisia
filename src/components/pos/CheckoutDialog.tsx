import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Banknote, Building2, Check } from 'lucide-react';

type PaymentMethod = 'cash' | 'card' | 'virement';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  tvaTotal: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  amountReceived: number;
  setAmountReceived: (n: number) => void;
  submitting: boolean;
  onCheckout: () => void;
  formatDT: (n: number) => string;
}

export default function CheckoutDialog({
  open, onOpenChange, total, tvaTotal, itemCount,
  paymentMethod, setPaymentMethod, amountReceived, setAmountReceived,
  submitting, onCheckout, formatDT,
}: CheckoutDialogProps) {
  const change = amountReceived - total;
  const isPartial = paymentMethod === 'cash' && amountReceived > 0 && amountReceived < total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Encaissement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">Total à payer</p>
            <p className="text-3xl font-bold text-primary">{formatDT(total)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {itemCount} article(s) — TVA: {formatDT(tvaTotal)}
            </p>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Mode de paiement</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'cash' as const, label: 'Espèces', icon: Banknote },
                { value: 'card' as const, label: 'Carte', icon: CreditCard },
                { value: 'virement' as const, label: 'Virement', icon: Building2 },
              ]).map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`
                    flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all text-sm font-medium
                    ${paymentMethod === pm.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                    }
                  `}
                >
                  <pm.icon className="h-5 w-5" />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Montant reçu (TND)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  value={amountReceived || ''}
                  onChange={e => setAmountReceived(+e.target.value)}
                  className="h-12 text-xl text-center font-bold"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setAmountReceived(v)}>
                    {v} TND
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setAmountReceived(Math.ceil(total))}>
                  Exact
                </Button>
              </div>
              {amountReceived >= total && (
                <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm text-muted-foreground">Monnaie à rendre</p>
                  <p className="text-2xl font-bold text-success">{formatDT(change)}</p>
                </div>
              )}
              {isPartial && (
                <div className="text-center p-2 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-warning">
                    ⚠ Paiement partiel — Reste: {formatDT(total - amountReceived)}
                  </p>
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full h-12 text-base font-semibold gap-2"
            disabled={submitting || (paymentMethod === 'cash' && amountReceived <= 0)}
            onClick={onCheckout}
          >
            {submitting ? (
              'Validation...'
            ) : (
              <>
                <Check className="h-5 w-5" />
                Valider la vente
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
