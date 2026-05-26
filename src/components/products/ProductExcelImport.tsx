import { useState } from 'react';
import {
  Modal, ModalContent, ModalHeader, ModalBody,
  Button, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, RadioGroup, Radio,
} from '@heroui/react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { productsApi } from '@/services/api';
import type { DbAttributeSchema } from '@/services/api/productAttributes';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  attributeSchemas: DbAttributeSchema[];
  onDone?: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'result';
type DuplicateMode = 'skip' | 'update' | 'create';

const APP_FIELDS = [
  { key: 'name', label: 'Nom du produit', required: true },
  { key: 'description', label: 'Description' },
  { key: 'category_name', label: 'Catégorie (nom)' },
  { key: 'unit', label: 'Unité' },
  { key: 'purchase_price', label: "Prix d'achat" },
  { key: 'selling_price', label: 'Prix de vente' },
  { key: 'tva_rate', label: 'TVA %' },
  { key: 'stock', label: 'Stock' },
  { key: 'min_stock', label: 'Stock minimum' },
  { key: 'product_type', label: 'Type (finished_product/raw_material/service)' },
];

function autoMap(headers: string[], options: { key: string; label: string }[]) {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const h of headers) {
    const nh = norm(h);
    const found = options.find(o => norm(o.key) === nh || norm(o.label).includes(nh) || nh.includes(norm(o.key)));
    if (found) map[h] = found.key;
  }
  return map;
}

export default function ProductExcelImport({ open, onOpenChange, companyId, attributeSchemas, onDone }: Props) {
  const { categories, products, refresh } = useData();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // excel col -> app field key or attribute key (prefixed with attr:)
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; errors: string[] }>({ imported: 0, updated: 0, skipped: 0, errors: [] });

  const allTargets = [
    ...APP_FIELDS.map(f => ({ key: f.key, label: f.label, group: 'Champs standards' })),
    ...attributeSchemas.map(s => ({ key: 'attr:' + s.field_key, label: s.label, group: 'Attributs personnalisés' })),
  ];

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (json.length === 0) {
      toast({ title: 'Fichier vide', variant: 'destructive' });
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRows(json);
    setMapping(autoMap(hdrs, allTargets));
    setStep('map');
  };

  const findCategoryId = (name: string): string | null => {
    if (!name) return null;
    const cat = categories.find(c => c.name.toLowerCase() === String(name).toLowerCase());
    return cat?.id ?? null;
  };

  const doImport = async () => {
    setImporting(true);
    const res = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const product: any = {
          tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
          purchase_price: 0, selling_price: 0,
          product_type: 'finished_product', category_type: 'normal',
        };
        const customAttrs: Record<string, any> = {};

        for (const [excelCol, targetKey] of Object.entries(mapping)) {
          if (!targetKey || targetKey === '_ignore') continue;
          const raw = row[excelCol];
          if (raw === '' || raw === undefined || raw === null) continue;

          if (targetKey.startsWith('attr:')) {
            customAttrs[targetKey.slice(5)] = raw;
            continue;
          }
          if (targetKey === 'category_name') {
            product.category_id = findCategoryId(String(raw));
            continue;
          }
          if (['purchase_price','selling_price','tva_rate','stock','min_stock'].includes(targetKey)) {
            product[targetKey] = Number(raw) || 0;
            continue;
          }
          product[targetKey] = raw;
        }

        if (!product.name || !String(product.name).trim()) {
          res.skipped++;
          res.errors.push(`Ligne ${i + 2}: nom manquant`);
          continue;
        }

        if (Object.keys(customAttrs).length > 0) product.custom_attributes = customAttrs;

        // Duplicate by name (case-insensitive)
        const dup = products.find(p => p.name.toLowerCase() === String(product.name).toLowerCase());

        if (dup && duplicateMode === 'skip') {
          res.skipped++;
          continue;
        }
        if (dup && duplicateMode === 'update') {
          const { error } = await productsApi.updateProduct(dup.id, product);
          if (error) { res.errors.push(`Ligne ${i + 2}: ${error.message}`); res.skipped++; }
          else res.updated++;
          continue;
        }

        const { error } = await productsApi.insertProduct(companyId, product);
        if (error) { res.errors.push(`Ligne ${i + 2}: ${error.message}`); res.skipped++; }
        else res.imported++;
      } catch (e: any) {
        res.errors.push(`Ligne ${i + 2}: ${e.message}`);
        res.skipped++;
      }
    }

    setResult(res);
    setImporting(false);
    setStep('result');
    refresh();
    onDone?.();
  };

  const reset = () => {
    setStep('upload'); setRows([]); setHeaders([]); setMapping({});
    setResult({ imported: 0, updated: 0, skipped: 0, errors: [] });
  };

  const close = () => { reset(); onOpenChange(false); };

  return (
    <Modal isDismissable={false} isOpen={open} onOpenChange={(o) => { if (!o) close(); }} size="4xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" /> Importer des produits depuis Excel
        </ModalHeader>
        <ModalBody className="pb-6 space-y-4">

          {step === 'upload' && (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Formats acceptés : .xlsx, .xls, .csv</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                id="excel-upload"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <Button as="label" htmlFor="excel-upload" color="primary" startContent={<Upload className="h-4 w-4" />}>
                Choisir un fichier
              </Button>
            </div>
          )}

          {step === 'map' && (
            <>
              <p className="text-sm text-muted-foreground">
                Associez chaque colonne Excel à un champ de l'application. Les colonnes non mappées seront ignorées.
              </p>
              <Table aria-label="Mapping" removeWrapper isStriped>
                <TableHeader>
                  <TableColumn>COLONNE EXCEL</TableColumn>
                  <TableColumn>EXEMPLE</TableColumn>
                  <TableColumn>CHAMP APPLICATION</TableColumn>
                </TableHeader>
                <TableBody>
                  {headers.map(h => (
                    <TableRow key={h}>
                      <TableCell className="font-medium">{h}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{String(rows[0]?.[h] ?? '').slice(0, 40)}</TableCell>
                      <TableCell>
                        <Select
                          aria-label={`Mapping ${h}`}
                          size="sm"
                          selectedKeys={[mapping[h] || '_ignore']}
                          onSelectionChange={(keys) => {
                            const v = Array.from(keys)[0] as string;
                            setMapping(m => ({ ...m, [h]: v }));
                          }}
                          className="min-w-[240px]"
                        >
                          {[
                            <SelectItem key="_ignore">— Ignorer —</SelectItem>,
                            ...allTargets.map(t => <SelectItem key={t.key}>{t.label}</SelectItem>),
                          ] as any}
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between">
                <Button variant="bordered" onPress={reset}>← Recommencer</Button>
                <Button color="primary" onPress={() => setStep('preview')}
                  isDisabled={!Object.values(mapping).includes('name')}>
                  Suivant ({rows.length} lignes)
                </Button>
              </div>
              {!Object.values(mapping).includes('name') && (
                <p className="text-xs text-warning">Le champ « Nom du produit » est obligatoire.</p>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="space-y-3">
                <div className="text-sm font-medium">Comportement en cas de doublon (même nom) :</div>
                <RadioGroup value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}>
                  <Radio value="skip">Ignorer le doublon</Radio>
                  <Radio value="update">Mettre à jour le produit existant</Radio>
                  <Radio value="create">Créer quand même (peut créer des doublons)</Radio>
                </RadioGroup>
              </div>
              <div className="text-xs text-muted-foreground">
                {rows.length} lignes prêtes à importer.
              </div>
              <div className="flex justify-between">
                <Button variant="bordered" onPress={() => setStep('map')}>← Retour</Button>
                <Button color="primary" onPress={doImport} isLoading={importing} startContent={<Upload className="h-4 w-4" />}>
                  Lancer l'import
                </Button>
              </div>
            </>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-success">{result.imported}</div>
                  <div className="text-xs text-muted-foreground">Créés</div>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{result.updated}</div>
                  <div className="text-xs text-muted-foreground">Mis à jour</div>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-warning">{result.skipped}</div>
                  <div className="text-xs text-muted-foreground">Ignorés</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-border p-4 max-h-48 overflow-auto">
                  <div className="flex items-center gap-2 text-warning mb-2"><AlertTriangle className="h-4 w-4" /> Avertissements</div>
                  <ul className="text-xs space-y-1">
                    {result.errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 50 && <li>… {result.errors.length - 50} autres</li>}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" /> Import terminé
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="bordered" onPress={reset}>Nouvel import</Button>
                <Button color="primary" onPress={close}>Fermer</Button>
              </div>
            </div>
          )}

        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
