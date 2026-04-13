import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calculator, Building2, User } from 'lucide-react';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const TVA_RATES = [0, 7, 13, 19];
const formatTND = (n: number) => n.toFixed(3) + ' TND';

export default function TaxDeclarationPage() {
  const { invoices, expenses, company } = useData();
  const { role } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [declType, setDeclType] = useState<'mensuelle' | 'annuelle'>('mensuelle');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));

  // Editable overrides
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});

  const yearNum = parseInt(selectedYear);
  const monthNum = parseInt(selectedMonth);

  const years = useMemo(() => {
    const allYears = new Set([
      ...invoices.map(i => new Date(i.date).getFullYear()),
      ...expenses.map(e => new Date(e.date).getFullYear()),
      currentYear,
    ]);
    return [...allYears].sort((a, b) => b - a);
  }, [invoices, expenses, currentYear]);

  // Filter data by period
  const periodInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (i.type !== 'facture') return false;
      const d = new Date(i.date);
      if (d.getFullYear() !== yearNum) return false;
      if (declType === 'mensuelle' && d.getMonth() !== monthNum) return false;
      return true;
    });
  }, [invoices, yearNum, monthNum, declType]);

  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      if (d.getFullYear() !== yearNum) return false;
      if (declType === 'mensuelle' && d.getMonth() !== monthNum) return false;
      return true;
    });
  }, [expenses, yearNum, monthNum, declType]);

  // Calculations
  const calculations = useMemo(() => {
    const caHT = periodInvoices.reduce((s, i) => s + Number(i.subtotal), 0);
    const caTTC = periodInvoices.reduce((s, i) => s + Number(i.total), 0);
    const tvaCollected = periodInvoices.reduce((s, i) => s + Number(i.tva_total), 0);
    const tvaPaid = periodExpenses.reduce((s, e) => s + Number(e.tva_amount || 0), 0);
    const tvaNet = tvaCollected - tvaPaid;
    const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

    // Breakdown by rate
    const byRate = TVA_RATES.map(rate => {
      const baseHT = periodInvoices.reduce((s, inv) =>
        s + (inv.items || []).filter(it => it.tva_rate === rate).reduce((ss, it) => ss + it.quantity * Number(it.unit_price), 0), 0);
      const collected = periodInvoices.reduce((s, inv) =>
        s + (inv.items || []).filter(it => it.tva_rate === rate).reduce((ss, it) => ss + (it.quantity * Number(it.unit_price) * it.tva_rate) / 100, 0), 0);
      const deductible = periodExpenses.filter(e => e.tva_rate === rate).reduce((s, e) => s + Number(e.tva_amount || 0), 0);
      return { rate, baseHT, collected, deductible, net: collected - deductible };
    }).filter(r => r.baseHT > 0 || r.collected > 0 || r.deductible > 0);

    return { caHT, caTTC, tvaCollected, tvaPaid, tvaNet, totalExpenses, byRate };
  }, [periodInvoices, periodExpenses]);

  const getValue = (key: string, autoValue: number) =>
    manualEdits[key] !== undefined ? manualEdits[key] : autoValue;

  const setManualEdit = (key: string, val: number) =>
    setManualEdits(prev => ({ ...prev, [key]: val }));

  const resetManualEdits = () => setManualEdits({});

  const periodLabel = declType === 'mensuelle'
    ? `${MONTHS_FR[monthNum]} ${yearNum}`
    : `Année ${yearNum}`;

  const legalForm = company?.legal_form || 'sarl';
  const isPersonnePhysique = legalForm === 'personne_physique';

  // Generate PDF
  const generateDeclarationPdf = () => {
    const caHT = getValue('caHT', calculations.caHT);
    const tvaCollected = getValue('tvaCollected', calculations.tvaCollected);
    const tvaPaid = getValue('tvaPaid', calculations.tvaPaid);
    const tvaNet = tvaCollected - tvaPaid;
    const totalExpenses = getValue('totalExpenses', calculations.totalExpenses);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Déclaration fiscale</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1a1a2e; font-size: 13px; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0f3460; padding-bottom: 20px; }
  .header h1 { font-size: 20px; color: #0f3460; margin-bottom: 4px; }
  .header h2 { font-size: 14px; color: #555; font-weight: 400; }
  .company-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
  .company-info p { margin: 4px 0; }
  .section { margin: 25px 0; }
  .section h3 { font-size: 15px; color: #0f3460; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 10px 12px; text-align: left; border: 1px solid #ddd; }
  th { background: #0f3460; color: white; font-weight: 600; font-size: 12px; }
  td { font-size: 12px; }
  tr:nth-child(even) { background: #f8f9fa; }
  .amount { text-align: right; font-family: 'Courier New', monospace; }
  .total-row { font-weight: 700; background: #e8eef6 !important; }
  .net-row { font-weight: 700; background: #fff3cd !important; font-size: 14px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature div { width: 45%; }
  .signature p { border-top: 1px solid #333; padding-top: 8px; margin-top: 50px; text-align: center; font-size: 12px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>DÉCLARATION FISCALE ${declType === 'mensuelle' ? 'MENSUELLE' : 'ANNUELLE'}</h1>
  <h2>${periodLabel}</h2>
  <p style="margin-top:8px;font-size:11px;color:#777">${isPersonnePhysique ? 'Régime forfaitaire — Personne physique (Patente)' : 'Régime réel — ' + (legalForm || 'SARL').toUpperCase()}</p>
</div>

<div class="company-info">
  <p><strong>${company?.name || 'Mon Entreprise'}</strong></p>
  ${company?.matricule_fiscal ? `<p>Matricule fiscal : ${company.matricule_fiscal}</p>` : ''}
  ${company?.code_tva ? `<p>Code TVA : ${company.code_tva}</p>` : ''}
  ${company?.address ? `<p>Adresse : ${company.address}</p>` : ''}
  ${company?.phone ? `<p>Tél : ${company.phone}</p>` : ''}
</div>

<div class="section">
  <h3>1. Chiffre d'affaires</h3>
  <table>
    <tr><td>Chiffre d'affaires HT</td><td class="amount">${formatTND(caHT)}</td></tr>
    <tr><td>Total dépenses</td><td class="amount">${formatTND(totalExpenses)}</td></tr>
  </table>
</div>

<div class="section">
  <h3>2. Détail TVA par taux</h3>
  <table>
    <tr><th>Taux</th><th class="amount">Base HT</th><th class="amount">TVA collectée</th><th class="amount">TVA déductible</th><th class="amount">Solde</th></tr>
    ${calculations.byRate.map(r => `
      <tr>
        <td>${r.rate}%</td>
        <td class="amount">${formatTND(r.baseHT)}</td>
        <td class="amount">${formatTND(r.collected)}</td>
        <td class="amount">${formatTND(r.deductible)}</td>
        <td class="amount">${formatTND(r.net)}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td>Total</td>
      <td class="amount">${formatTND(calculations.byRate.reduce((s, r) => s + r.baseHT, 0))}</td>
      <td class="amount">${formatTND(tvaCollected)}</td>
      <td class="amount">${formatTND(tvaPaid)}</td>
      <td class="amount">${formatTND(tvaNet)}</td>
    </tr>
  </table>
</div>

<div class="section">
  <h3>3. Récapitulatif</h3>
  <table>
    <tr><td>TVA collectée</td><td class="amount">${formatTND(tvaCollected)}</td></tr>
    <tr><td>TVA déductible</td><td class="amount">${formatTND(tvaPaid)}</td></tr>
    <tr class="net-row"><td>${tvaNet >= 0 ? 'TVA nette à payer' : 'Crédit de TVA'}</td><td class="amount">${formatTND(Math.abs(tvaNet))}</td></tr>
  </table>
</div>

<div class="signature">
  <div><p>Cachet et signature de l'entreprise</p></div>
  <div><p>Date : ___/___/______</p></div>
</div>

<div class="footer">
  <p>Document généré automatiquement — ${company?.name || 'Fatourty'} — ${new Date().toLocaleDateString('fr-TN')}</p>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <p>Accès réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Déclarations fiscales</h1>
        <Button onClick={generateDeclarationPdf} className="gap-2">
          <Download className="h-4 w-4" /> Exporter PDF
        </Button>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Type de déclaration</Label>
              <Select value={declType} onValueChange={v => { setDeclType(v as any); resetManualEdits(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensuelle">
                    <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Mensuelle (TVA)</div>
                  </SelectItem>
                  <SelectItem value="annuelle">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Annuelle</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Année</Label>
              <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); resetManualEdits(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {declType === 'mensuelle' && (
              <div>
                <Label className="text-xs">Mois</Label>
                <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); resetManualEdits(); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_FR.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4" />
                {periodLabel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenus</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Chiffre d'affaires HT</Label>
              <Input
                type="number" step="0.001"
                value={getValue('caHT', calculations.caHT)}
                onChange={e => setManualEdit('caHT', +e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TVA collectée</Label>
              <Input
                type="number" step="0.001"
                value={getValue('tvaCollected', calculations.tvaCollected)}
                onChange={e => setManualEdit('tvaCollected', +e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">{periodInvoices.length} facture(s) — période : {periodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Charges</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Total dépenses TTC</Label>
              <Input
                type="number" step="0.001"
                value={getValue('totalExpenses', calculations.totalExpenses)}
                onChange={e => setManualEdit('totalExpenses', +e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TVA déductible</Label>
              <Input
                type="number" step="0.001"
                value={getValue('tvaPaid', calculations.tvaPaid)}
                onChange={e => setManualEdit('tvaPaid', +e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">{periodExpenses.length} dépense(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* TVA Net Result */}
      <Card className={calculations.tvaNet >= 0 ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20' : 'border-green-300 bg-green-50/30 dark:bg-green-950/20'}>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">
            {calculations.tvaNet >= 0 ? 'TVA nette à reverser' : 'Crédit de TVA'}
          </p>
          <p className="text-3xl font-bold">{formatTND(Math.abs(getValue('tvaCollected', calculations.tvaCollected) - getValue('tvaPaid', calculations.tvaPaid)))}</p>
        </CardContent>
      </Card>

      {/* Rate Breakdown */}
      {calculations.byRate.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Détail par taux de TVA</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taux</TableHead>
                    <TableHead className="text-right">Base HT</TableHead>
                    <TableHead className="text-right">TVA collectée</TableHead>
                    <TableHead className="text-right">TVA déductible</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.byRate.map(r => (
                    <TableRow key={r.rate}>
                      <TableCell><Badge variant="outline">{r.rate}%</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatTND(r.baseHT)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">{formatTND(r.collected)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">{formatTND(r.deductible)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${r.net >= 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatTND(r.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(manualEdits).length > 0 && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={resetManualEdits}>
            Réinitialiser les valeurs calculées
          </Button>
        </div>
      )}
    </div>
  );
}
