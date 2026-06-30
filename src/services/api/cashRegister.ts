import { supabase } from '@/integrations/supabase/client';

export type CashMovementType = 'sale' | 'expense' | 'cash_in' | 'cash_out';

export interface CashSession {
  id: string;
  company_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
  created_at: string;
}

export interface CashMovement {
  id: string;
  company_id: string;
  session_id: string;
  type: CashMovementType;
  amount: number;
  reference: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export async function fetchOpenSession(companyId: string) {
  return supabase
    .from('cash_sessions' as any)
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .maybeSingle();
}

export async function fetchSessions(companyId: string, limit = 50) {
  return supabase
    .from('cash_sessions' as any)
    .select('*')
    .eq('company_id', companyId)
    .order('opened_at', { ascending: false })
    .limit(limit);
}

export async function fetchMovements(sessionId: string) {
  return supabase
    .from('cash_movements' as any)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
}

export async function openSession(data: {
  company_id: string;
  opening_balance: number;
  opened_by?: string | null;
  notes?: string | null;
}) {
  return supabase.from('cash_sessions' as any).insert(data).select().single();
}

export async function closeSession(id: string, data: {
  closing_balance: number;
  expected_balance: number;
  difference: number;
  closed_by?: string | null;
  notes?: string | null;
}) {
  return supabase
    .from('cash_sessions' as any)
    .update({ ...data, status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id);
}

export async function insertMovement(data: {
  company_id: string;
  session_id: string;
  type: CashMovementType;
  amount: number;
  reference?: string | null;
  reason?: string | null;
  created_by?: string | null;
}) {
  return supabase.from('cash_movements' as any).insert(data).select().single();
}

export function computeBalance(opening: number, movements: Pick<CashMovement, 'type' | 'amount'>[]) {
  let balance = Number(opening) || 0;
  for (const m of movements) {
    const amt = Number(m.amount) || 0;
    if (m.type === 'sale' || m.type === 'cash_in') balance += amt;
    else balance -= amt;
  }
  return balance;
}
