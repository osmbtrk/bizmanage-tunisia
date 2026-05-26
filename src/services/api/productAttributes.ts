import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AttributeFieldType = 'text' | 'number' | 'select' | 'code';

export type DbAttributeSchema = Database['public']['Tables']['product_attribute_schemas']['Row'];

export async function fetchAttributeSchemas(companyId: string) {
  return supabase
    .from('product_attribute_schemas')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
}

export async function insertAttributeSchema(data: {
  company_id: string;
  category_id: string | null;
  field_key: string;
  label: string;
  field_type: AttributeFieldType;
  options?: string[];
  is_required?: boolean;
  is_searchable?: boolean;
  sort_order?: number;
}) {
  return supabase.from('product_attribute_schemas').insert({
    ...data,
    options: (data.options ?? []) as any,
  } as any).select().single();
}

export async function updateAttributeSchema(id: string, data: Partial<{
  category_id: string | null;
  field_key: string;
  label: string;
  field_type: AttributeFieldType;
  options: string[];
  is_required: boolean;
  is_searchable: boolean;
  sort_order: number;
}>) {
  return supabase.from('product_attribute_schemas').update(data as any).eq('id', id);
}

export async function deleteAttributeSchema(id: string) {
  return supabase.from('product_attribute_schemas').delete().eq('id', id);
}
