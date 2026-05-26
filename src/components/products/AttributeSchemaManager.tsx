import { useEffect, useState } from 'react';
import {
  Modal, ModalContent, ModalHeader, ModalBody,
  Button, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Switch,
} from '@heroui/react';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { productAttributesApi } from '@/services/api';
import type { DbAttributeSchema, AttributeFieldType } from '@/services/api/productAttributes';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  onChanged?: () => void;
}

const TYPE_LABEL: Record<AttributeFieldType, string> = {
  text: 'Texte', number: 'Nombre', select: 'Liste', code: 'Code/Barcode',
};

const emptyDraft = {
  category_id: '' as string,
  field_key: '',
  label: '',
  field_type: 'text' as AttributeFieldType,
  options: '' as string,
  is_required: false,
  is_searchable: false,
};

export default function AttributeSchemaManager({ open, onOpenChange, companyId, onChanged }: Props) {
  const { categories } = useData();
  const { toast } = useToast();
  const [list, setList] = useState<DbAttributeSchema[]>([]);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const { data } = await productAttributesApi.fetchAttributeSchemas(companyId);
    setList((data as any) || []);
  };

  useEffect(() => { if (open && companyId) reload(); }, [open, companyId]);

  const handleAdd = async () => {
    const key = draft.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key || !draft.label.trim()) {
      toast({ title: 'Clé et libellé requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await productAttributesApi.insertAttributeSchema({
      company_id: companyId,
      category_id: draft.category_id || null,
      field_key: key,
      label: draft.label.trim(),
      field_type: draft.field_type,
      options: draft.field_type === 'select'
        ? draft.options.split(',').map(o => o.trim()).filter(Boolean)
        : [],
      is_required: draft.is_required,
      is_searchable: draft.is_searchable,
      sort_order: list.length,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setDraft({ ...emptyDraft });
    await reload();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    await productAttributesApi.deleteAttributeSchema(id);
    await reload();
    onChanged?.();
  };

  const catLabel = (id: string | null) => {
    if (!id) return 'Global';
    return categories.find(c => c.id === id)?.name || '—';
  };

  return (
    <Modal isDismissable={false} isOpen={open} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Attributs personnalisés des produits
        </ModalHeader>
        <ModalBody className="pb-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Définissez des champs additionnels (RAM, IMEI, taille, couleur, garantie…) globalement ou par catégorie.
          </p>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="text-sm font-medium">Nouvel attribut</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Libellé" labelPlacement="outside" placeholder="ex: RAM" value={draft.label}
                onValueChange={v => setDraft(d => ({ ...d, label: v, field_key: d.field_key || v }))} />
              <Input label="Clé technique" labelPlacement="outside" placeholder="ex: ram" value={draft.field_key}
                onValueChange={v => setDraft(d => ({ ...d, field_key: v }))} />
              <Select label="Type" labelPlacement="outside" selectedKeys={[draft.field_type]}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as AttributeFieldType;
                  if (v) setDraft(d => ({ ...d, field_type: v }));
                }}>
                {(['text','number','select','code'] as AttributeFieldType[]).map(t => (
                  <SelectItem key={t}>{TYPE_LABEL[t]}</SelectItem>
                ))}
              </Select>
              <Select label="Portée" labelPlacement="outside"
                selectedKeys={[draft.category_id || '_global']}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  setDraft(d => ({ ...d, category_id: v === '_global' ? '' : v }));
                }}>
                {[<SelectItem key="_global">Global (tous produits)</SelectItem>,
                  ...categories.map(c => <SelectItem key={c.id}>{c.name}</SelectItem>)] as any}
              </Select>
              {draft.field_type === 'select' && (
                <div className="sm:col-span-2">
                  <Input label="Options (séparées par virgules)" labelPlacement="outside"
                    placeholder="ex: Rouge, Bleu, Noir"
                    value={draft.options}
                    onValueChange={v => setDraft(d => ({ ...d, options: v }))} />
                </div>
              )}
              <div className="flex items-center gap-4 sm:col-span-2 pt-1">
                <Switch isSelected={draft.is_required} onValueChange={v => setDraft(d => ({ ...d, is_required: v }))} size="sm">
                  Obligatoire
                </Switch>
                <Switch isSelected={draft.is_searchable} onValueChange={v => setDraft(d => ({ ...d, is_searchable: v }))} size="sm">
                  Recherchable POS (scan)
                </Switch>
              </div>
            </div>
            <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={handleAdd} isLoading={saving}>
              Ajouter l'attribut
            </Button>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Aucun attribut défini.</div>
          ) : (
            <Table aria-label="Attributs" removeWrapper isStriped>
              <TableHeader>
                <TableColumn>LIBELLÉ</TableColumn>
                <TableColumn>CLÉ</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>PORTÉE</TableColumn>
                <TableColumn>FLAGS</TableColumn>
                <TableColumn> </TableColumn>
              </TableHeader>
              <TableBody>
                {list.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.field_key}</TableCell>
                    <TableCell><Chip size="sm" variant="flat">{TYPE_LABEL[s.field_type as AttributeFieldType]}</Chip></TableCell>
                    <TableCell><Chip size="sm" variant="bordered">{catLabel(s.category_id)}</Chip></TableCell>
                    <TableCell className="space-x-1">
                      {s.is_required && <Chip size="sm" color="warning" variant="flat">Requis</Chip>}
                      {s.is_searchable && <Chip size="sm" color="success" variant="flat">Scan</Chip>}
                    </TableCell>
                    <TableCell>
                      <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
