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
}) {
  return supabase.from('employees').insert(data).select().single();
}

export async function updateEmployee(id: string, data: Partial<{
  full_name: string;
  role: string;
  phone: string;
  email: string;
  is_active: boolean;
}>) {
  return supabase.from('employees').update(data).eq('id', id);
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
}) {
  return supabase.from('employee_attendance').upsert(data, { onConflict: 'employee_id,date' });
}
