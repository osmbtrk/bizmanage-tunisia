import { supabase } from '@/integrations/supabase/client';

export async function fetchBomItems(finishedProductId: string) {
  return supabase.from('bom_items').select('*').eq('finished_product_id', finishedProductId);
}

export async function replaceBomItems(
  finishedProductId: string,
  items: { raw_material_id: string; quantity: number; unit_type: string }[]
) {
  await supabase.from('bom_items').delete().eq('finished_product_id', finishedProductId);
  if (items.length > 0) {
    return supabase.from('bom_items').insert(
      items.map(b => ({ finished_product_id: finishedProductId, ...b }))
    );
  }
}
