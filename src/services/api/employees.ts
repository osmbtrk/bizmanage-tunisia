import { supabase } from '@/integrations/supabase/client';

export async function fetchEmployees(companyId: string) {
  return supabase.from('employees').select('*').eq('company_id', companyId).order('full_name');
}

export async function insertEmployee(data: {
  company_id: string;
  full_name: string;
  role: string;
  phone?: string;
  email?: string;
  hire_date?: string;
  base_salary?: number;
  commission_type?: string;
  commission_value?: number;
  user_id?: string | null;
}) {
  return supabase.from('employees').insert(data as any).select().single();
}

export async function updateEmployee(id: string, data: Partial<{
  full_name: string;
  role: string;
  phone: string;
  email: string;
  is_active: boolean;
  base_salary: number;
  commission_type: string;
  commission_value: number;
}>) {
  return supabase.from('employees').update(data as any).eq('id', id);
}

export async function deleteEmployee(id: string) {
  return supabase.from('employees').delete().eq('id', id);
}

export async function fetchAttendance(companyId: string, month?: string) {
  let query = supabase.from('employee_attendance').select('*').eq('company_id', companyId);
  if (month) {
    query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  }
  return query.order('date', { ascending: false });
}

export async function upsertAttendance(data: {
  company_id: string;
  employee_id: string;
  date: string;
  status: string;
  shift?: string;
  notes?: string;
  check_in?: string | null;
  check_out?: string | null;
}) {
  return supabase.from('employee_attendance').upsert(data as any, { onConflict: 'employee_id,date' });
}

export async function createEmployeeAccount(payload: {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'accountant' | 'employee';
}) {
  const res = await supabase.functions.invoke('create-employee-account', { body: payload });
  // When the edge fn returns non-2xx, supabase-js puts a FunctionsHttpError in res.error.
  // Try to read the actual server message from the response body for clearer UI feedback.
  if (res.error && (res.error as any).context?.json) {
    try {
      const body = await (res.error as any).context.json();
      if (body?.error) {
        return { data: null, error: { ...res.error, message: body.error } } as any;
      }
    } catch { /* ignore */ }
  }
  return res;
}

export async function fetchEmployeeByUserId(userId: string) {
  return supabase.from('employees').select('*').eq('user_id', userId).maybeSingle();
}
