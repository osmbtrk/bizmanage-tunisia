import { supabase } from '@/integrations/supabase/client';

export async function logActivity(data: {
  company_id: string;
  user_id: string;
  employee_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
}) {
  return supabase.from('activity_logs').insert({
    company_id: data.company_id,
    user_id: data.user_id,
    employee_id: data.employee_id || null,
    action: data.action,
    entity_type: data.entity_type || null,
    entity_id: data.entity_id || null,
    details: data.details || {},
  } as any);
}

export async function fetchActivityLogs(companyId: string, options?: { employeeId?: string; limit?: number }) {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (options?.employeeId) {
    query = query.eq('employee_id', options.employeeId);
  }

  return query;
}
