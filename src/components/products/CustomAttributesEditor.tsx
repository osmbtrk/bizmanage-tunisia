import { Input, Select, SelectItem } from '@heroui/react';
import type { DbAttributeSchema } from '@/services/api/productAttributes';

interface Props {
  schemas: DbAttributeSchema[];
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  /** Filter schemas applicable to this product's category. */
  categoryId?: string | null;
}

/**
 * Renders dynamic inputs for company-defined product attributes.
 * Field is shown when its category_id is null (global) OR matches the product's category.
 */
export default function CustomAttributesEditor({ schemas, values, onChange, categoryId }: Props) {
  const applicable = schemas
    .filter(s => !s.category_id || s.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (applicable.length === 0) return null;

  const set = (key: string, v: any) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attributs personnalisés</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {applicable.map(s => {
          const val = values?.[s.field_key] ?? '';
          if (s.field_type === 'select') {
            const opts: string[] = Array.isArray(s.options) ? (s.options as any) : [];
            return (
              <Select
                key={s.id}
                label={s.label + (s.is_required ? ' *' : '')}
                labelPlacement="outside"
                placeholder="—"
                selectedKeys={val ? [String(val)] : []}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  set(s.field_key, v || '');
                }}
              >
                {opts.map(opt => <SelectItem key={opt}>{opt}</SelectItem>)}
              </Select>
            );
          }
          return (
            <Input
              key={s.id}
              label={s.label + (s.is_required ? ' *' : '')}
              labelPlacement="outside"
              type={s.field_type === 'number' ? 'number' : 'text'}
              placeholder={s.field_type === 'code' ? 'Scanner ou saisir' : ''}
              value={val === null || val === undefined ? '' : String(val)}
              onValueChange={(v) => set(s.field_key, s.field_type === 'number' ? (v === '' ? '' : Number(v)) : v)}
            />
          );
        })}
      </div>
    </div>
  );
}
