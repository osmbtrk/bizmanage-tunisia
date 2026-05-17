import {
  Modal, ModalContent, ModalHeader, ModalBody,
  Button, Input,
} from '@heroui/react';
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

  const methods = [
    { value: 'cash' as const, label: 'Espèces', icon: Banknote },
    { value: 'card' as const, label: 'Carte', icon: CreditCard },
    { value: 'virement' as const, label: 'Virement', icon: Building2 },
  ];

  return (
    <Modal isDismissable={false}
      isOpen={open}
      onOpenChange={onOpenChange}
      size="md"
      placement="center"
      scrollBehavior="inside"
      backdrop="opaque"
      classNames={{ base: 'bg-background border border-border', wrapper: 'items-center' }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Encaissement
            </ModalHeader>
            <ModalBody className="pb-6 space-y-4">
              <div className="text-center p-4 rounded-lg bg-secondary">
                <p className="text-sm text-muted-foreground">Total à payer</p>
                <p className="text-3xl font-bold text-primary">{formatDT(total)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {itemCount} article(s) — TVA: {formatDT(tvaTotal)}
                </p>
              </div>

              <div>
                <p className="text-sm mb-2 font-medium">Mode de paiement</p>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map(pm => {
                    const active = paymentMethod === pm.value;
                    return (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => setPaymentMethod(pm.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all text-sm font-medium ${
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <pm.icon className="h-5 w-5" />
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <Input
                    type="number"
                    label="Montant reçu (TND)"
                    step="0.001"
                    min={0}
                    value={amountReceived ? String(amountReceived) : ''}
                    onChange={e => setAmountReceived(+e.target.value)}
                    variant="bordered"
                    size="lg"
                    classNames={{ input: 'text-xl text-center font-bold' }}
                    autoFocus
                  />
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 20, 50].map(v => (
                      <Button key={v} variant="bordered" size="sm" className="flex-1 min-w-[60px] text-xs" onPress={() => setAmountReceived(v)}>
                        {v} TND
                      </Button>
                    ))}
                    <Button variant="bordered" size="sm" className="flex-1 min-w-[60px] text-xs" onPress={() => setAmountReceived(Math.ceil(total))}>
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
                color="primary"
                className="w-full h-12 text-base font-semibold"
                isLoading={submitting}
                isDisabled={submitting || (paymentMethod === 'cash' && amountReceived <= 0)}
                onPress={onCheckout}
                startContent={!submitting ? <Check className="h-5 w-5" /> : undefined}
              >
                {submitting ? 'Validation...' : 'Valider la vente'}
              </Button>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
