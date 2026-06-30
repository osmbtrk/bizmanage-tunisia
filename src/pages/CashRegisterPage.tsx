import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cashRegisterApi } from '@/services/api';
import type { CashSession, CashMovement, CashMovementType } from '@/services/api/cashRegister';
import {
  Button, Input, Card, CardBody, CardHeader, Chip, Modal, ModalContent,
  ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Table, TableHeader,
  TableColumn, TableBody, TableRow, TableCell, Divider, Textarea, Tabs, Tab,
} from '@heroui/react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, History, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const fmt = (n: number) => Number(n || 0).toFixed(3) + ' TND';

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  sale: 'Vente',
  expense: 'Dépense',
  cash_in: 'Entrée',
  cash_out: 'Sortie',
};

const MOVEMENT_COLORS: Record<CashMovementType, 'success' | 'danger' | 'primary' | 'warning'> = {
  sale: 'success',
  cash_in: 'primary',
  expense: 'danger',
  cash_out: 'warning',
};

export default function CashRegisterPage() {
  const { companyId, user } = useAuth();
  const [openSession, setOpenSession] = useState<CashSession | null>(null);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingNotes, setOpeningNotes] = useState('');

  const [moveDialog, setMoveDialog] = useState<CashMovementType | null>(null);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');

  const [closeDialog, setCloseDialog] = useState(false);
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [historyView, setHistoryView] = useState<CashSession | null>(null);
  const [historyMovements, setHistoryMovements] = useState<CashMovement[]>([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: open }, { data: list }] = await Promise.all([
      cashRegisterApi.fetchOpenSession(companyId),
      cashRegisterApi.fetchSessions(companyId, 50),
    ]);
    const o = (open as any) as CashSession | null;
    setOpenSession(o);
    setSessions(((list as any) || []) as CashSession[]);
    if (o) {
      const { data: mvs } = await cashRegisterApi.fetchMovements(o.id);
      setMovements(((mvs as any) || []) as CashMovement[]);
    } else {
      setMovements([]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const currentBalance = openSession
    ? cashRegisterApi.computeBalance(Number(openSession.opening_balance), movements)
    : 0;

  const totals = movements.reduce(
    (acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + Number(m.amount);
      return acc;
    },
    {} as Record<CashMovementType, number>,
  );

  const handleOpen = async () => {
    if (!companyId) return;
    const amount = Number(openingBalance) || 0;
    const { error } = await cashRegisterApi.openSession({
      company_id: companyId,
      opening_balance: amount,
      opened_by: user?.id || null,
      notes: openingNotes || null,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Caisse ouverte', description: `Fond de caisse: ${fmt(amount)}` });
    setOpenDialog(false);
    setOpeningBalance('0');
    setOpeningNotes('');
    load();
  };

  const handleMovement = async () => {
    if (!companyId || !openSession || !moveDialog) return;
    const amount = Number(moveAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }
    const { error } = await cashRegisterApi.insertMovement({
      company_id: companyId,
      session_id: openSession.id,
      type: moveDialog,
      amount,
      reason: moveReason || null,
      created_by: user?.id || null,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Mouvement enregistré' });
    setMoveDialog(null);
    setMoveAmount('');
    setMoveReason('');
    load();
  };

  const handleClose = async () => {
    if (!openSession) return;
    const closing = Number(closingBalance);
    if (isNaN(closing)) {
      toast({ title: 'Solde de clôture invalide', variant: 'destructive' });
      return;
    }
    const expected = currentBalance;
    const diff = closing - expected;
    const { error } = await cashRegisterApi.closeSession(openSession.id, {
      closing_balance: closing,
      expected_balance: expected,
      difference: diff,
      closed_by: user?.id || null,
      notes: closingNotes || null,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Caisse clôturée',
      description: `Attendu: ${fmt(expected)} — Compté: ${fmt(closing)} — Écart: ${fmt(diff)}`,
    });
    setCloseDialog(false);
    setClosingBalance('');
    setClosingNotes('');
    load();
  };

  const viewHistory = async (s: CashSession) => {
    setHistoryView(s);
    const { data } = await cashRegisterApi.fetchMovements(s.id);
    setHistoryMovements(((data as any) || []) as CashMovement[]);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="animate-fade-in space-y-6 max-w-full min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Caisse
        </h1>
        {openSession ? (
          <Button color="danger" startContent={<Lock className="h-4 w-4" />} onPress={() => { setClosingBalance(currentBalance.toFixed(3)); setCloseDialog(true); }}>
            Clôturer la caisse
          </Button>
        ) : (
          <Button color="primary" startContent={<Unlock className="h-4 w-4" />} onPress={() => setOpenDialog(true)}>
            Ouvrir une caisse
          </Button>
        )}
      </div>

      <Tabs aria-label="Caisse">
        <Tab key="current" title={<span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Session courante</span>}>
          {!openSession ? (
            <Card>
              <CardBody className="py-12 text-center text-muted-foreground">
                <Wallet className="mx-auto h-12 w-12 opacity-40 mb-2" />
                <p>Aucune caisse ouverte. Ouvrez une caisse pour commencer à enregistrer des mouvements.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card><CardBody><p className="text-xs text-muted-foreground">Fond de caisse</p><p className="text-xl font-bold">{fmt(Number(openSession.opening_balance))}</p></CardBody></Card>
                <Card><CardBody><p className="text-xs text-muted-foreground">Ventes</p><p className="text-xl font-bold text-success">{fmt(totals.sale || 0)}</p></CardBody></Card>
                <Card><CardBody><p className="text-xs text-muted-foreground">Dépenses</p><p className="text-xl font-bold text-danger">{fmt(totals.expense || 0)}</p></CardBody></Card>
                <Card><CardBody><p className="text-xs text-muted-foreground">Solde actuel</p><p className="text-2xl font-bold text-primary">{fmt(currentBalance)}</p></CardBody></Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button color="success" variant="flat" startContent={<ArrowDownToLine className="h-4 w-4" />} onPress={() => setMoveDialog('cash_in')}>Entrée d'espèces</Button>
                <Button color="warning" variant="flat" startContent={<ArrowUpFromLine className="h-4 w-4" />} onPress={() => setMoveDialog('cash_out')}>Sortie d'espèces</Button>
                <Button color="danger" variant="flat" startContent={<ArrowUpFromLine className="h-4 w-4" />} onPress={() => setMoveDialog('expense')}>Dépense</Button>
                <Button color="primary" variant="flat" startContent={<ArrowDownToLine className="h-4 w-4" />} onPress={() => setMoveDialog('sale')}>Vente cash</Button>
              </div>

              <Card>
                <CardHeader className="text-sm font-semibold">Mouvements de la session</CardHeader>
                <CardBody>
                  {movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucun mouvement</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table aria-label="Mouvements" removeWrapper isStriped>
                        <TableHeader>
                          <TableColumn>HEURE</TableColumn>
                          <TableColumn>TYPE</TableColumn>
                          <TableColumn>MOTIF</TableColumn>
                          <TableColumn className="text-right">MONTANT</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {movements.map(m => (
                            <TableRow key={m.id}>
                              <TableCell className="text-xs">{new Date(m.created_at).toLocaleTimeString('fr-FR')}</TableCell>
                              <TableCell><Chip size="sm" color={MOVEMENT_COLORS[m.type]} variant="flat">{MOVEMENT_LABELS[m.type]}</Chip></TableCell>
                              <TableCell className="text-xs">{m.reason || m.reference || '—'}</TableCell>
                              <TableCell className={`text-right tabular-nums font-medium ${m.type === 'sale' || m.type === 'cash_in' ? 'text-success' : 'text-danger'}`}>
                                {m.type === 'sale' || m.type === 'cash_in' ? '+' : '-'}{fmt(Number(m.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}
        </Tab>

        <Tab key="history" title={<span className="flex items-center gap-2"><History className="h-4 w-4" /> Historique</span>}>
          <Card>
            <CardBody>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune session</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table aria-label="Sessions" removeWrapper isStriped>
                    <TableHeader>
                      <TableColumn>OUVERTURE</TableColumn>
                      <TableColumn>CLÔTURE</TableColumn>
                      <TableColumn>FOND</TableColumn>
                      <TableColumn>ATTENDU</TableColumn>
                      <TableColumn>COMPTÉ</TableColumn>
                      <TableColumn>ÉCART</TableColumn>
                      <TableColumn>STATUT</TableColumn>
                      <TableColumn> </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{new Date(s.opened_at).toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString('fr-FR') : '—'}</TableCell>
                          <TableCell className="tabular-nums">{fmt(Number(s.opening_balance))}</TableCell>
                          <TableCell className="tabular-nums">{s.expected_balance != null ? fmt(Number(s.expected_balance)) : '—'}</TableCell>
                          <TableCell className="tabular-nums">{s.closing_balance != null ? fmt(Number(s.closing_balance)) : '—'}</TableCell>
                          <TableCell className={`tabular-nums ${Number(s.difference) < 0 ? 'text-danger' : Number(s.difference) > 0 ? 'text-warning' : ''}`}>
                            {s.difference != null ? fmt(Number(s.difference)) : '—'}
                          </TableCell>
                          <TableCell><Chip size="sm" color={s.status === 'open' ? 'success' : 'default'} variant="flat">{s.status === 'open' ? 'Ouverte' : 'Clôturée'}</Chip></TableCell>
                          <TableCell>
                            <Button isIconOnly size="sm" variant="light" onPress={() => viewHistory(s)}><FileText className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* Open session dialog */}
      <Modal isDismissable={false} isOpen={openDialog} onOpenChange={setOpenDialog}>
        <ModalContent>
          <ModalHeader>Ouvrir la caisse</ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="Fond de caisse (TND)"
              labelPlacement="outside"
              type="number"
              step="0.001"
              min={0}
              value={openingBalance}
              onValueChange={setOpeningBalance}
              variant="bordered"
            />
            <Textarea label="Notes" labelPlacement="outside" value={openingNotes} onValueChange={setOpeningNotes} variant="bordered" minRows={2} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpenDialog(false)}>Annuler</Button>
            <Button color="primary" onPress={handleOpen}>Ouvrir</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Movement dialog */}
      <Modal isDismissable={false} isOpen={!!moveDialog} onOpenChange={(v) => !v && setMoveDialog(null)}>
        <ModalContent>
          <ModalHeader>{moveDialog ? MOVEMENT_LABELS[moveDialog] : ''}</ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="Montant (TND)"
              labelPlacement="outside"
              type="number"
              step="0.001"
              min={0}
              value={moveAmount}
              onValueChange={setMoveAmount}
              variant="bordered"
              autoFocus
            />
            <Input label="Motif" labelPlacement="outside" value={moveReason} onValueChange={setMoveReason} variant="bordered" />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setMoveDialog(null)}>Annuler</Button>
            <Button color="primary" onPress={handleMovement}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Close session dialog */}
      <Modal isDismissable={false} isOpen={closeDialog} onOpenChange={setCloseDialog}>
        <ModalContent>
          <ModalHeader>Clôturer la caisse</ModalHeader>
          <ModalBody className="space-y-3">
            <Card><CardBody>
              <div className="flex justify-between text-sm"><span>Solde attendu</span><span className="font-bold">{fmt(currentBalance)}</span></div>
            </CardBody></Card>
            <Input
              label="Solde compté (TND)"
              labelPlacement="outside"
              type="number"
              step="0.001"
              value={closingBalance}
              onValueChange={setClosingBalance}
              variant="bordered"
            />
            {closingBalance !== '' && (
              <p className={`text-sm ${Number(closingBalance) - currentBalance < 0 ? 'text-danger' : Number(closingBalance) - currentBalance > 0 ? 'text-warning' : 'text-success'}`}>
                Écart: {fmt(Number(closingBalance) - currentBalance)}
              </p>
            )}
            <Textarea label="Notes" labelPlacement="outside" value={closingNotes} onValueChange={setClosingNotes} variant="bordered" minRows={2} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setCloseDialog(false)}>Annuler</Button>
            <Button color="danger" onPress={handleClose}>Clôturer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Session history detail */}
      <Modal isDismissable={false} isOpen={!!historyView} onOpenChange={(v) => !v && setHistoryView(null)} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Rapport de caisse — {historyView && new Date(historyView.opened_at).toLocaleDateString('fr-FR')}</ModalHeader>
          <ModalBody className="space-y-3 pb-4">
            {historyView && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <Card><CardBody><p className="text-xs text-muted-foreground">Fond</p><p className="font-bold">{fmt(Number(historyView.opening_balance))}</p></CardBody></Card>
                  <Card><CardBody><p className="text-xs text-muted-foreground">Attendu</p><p className="font-bold">{historyView.expected_balance != null ? fmt(Number(historyView.expected_balance)) : '—'}</p></CardBody></Card>
                  <Card><CardBody><p className="text-xs text-muted-foreground">Compté</p><p className="font-bold">{historyView.closing_balance != null ? fmt(Number(historyView.closing_balance)) : '—'}</p></CardBody></Card>
                  <Card><CardBody><p className="text-xs text-muted-foreground">Écart</p><p className={`font-bold ${Number(historyView.difference) < 0 ? 'text-danger' : ''}`}>{historyView.difference != null ? fmt(Number(historyView.difference)) : '—'}</p></CardBody></Card>
                </div>
                <Divider />
                <div className="overflow-x-auto">
                  <Table aria-label="Détails" removeWrapper isStriped>
                    <TableHeader>
                      <TableColumn>HEURE</TableColumn>
                      <TableColumn>TYPE</TableColumn>
                      <TableColumn>MOTIF</TableColumn>
                      <TableColumn className="text-right">MONTANT</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {historyMovements.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{new Date(m.created_at).toLocaleTimeString('fr-FR')}</TableCell>
                          <TableCell><Chip size="sm" color={MOVEMENT_COLORS[m.type]} variant="flat">{MOVEMENT_LABELS[m.type]}</Chip></TableCell>
                          <TableCell className="text-xs">{m.reason || m.reference || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(Number(m.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {historyView.notes && <p className="text-xs text-muted-foreground"><strong>Notes:</strong> {historyView.notes}</p>}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
