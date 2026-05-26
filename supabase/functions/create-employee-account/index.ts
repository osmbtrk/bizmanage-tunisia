import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'accountant' | 'employee';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Caller client (verifies JWT and resolves caller identity)
    const caller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = userData.user.id;

    // Verify admin role
    const { data: roleRow } = await caller.from('user_roles').select('role').eq('user_id', callerId).maybeSingle();
    if (!roleRow || roleRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Caller's company
    const { data: callerProfile } = await caller.from('profiles').select('company_id').eq('user_id', callerId).maybeSingle();
    const companyId = callerProfile?.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'No company' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = (await req.json()) as Payload;
    const { email, password, full_name, role } = body;
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 chars' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Create the auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'Could not create user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const newUserId = created.user.id;

    // The handle_new_user trigger creates a profile + new company + admin role.
    // Override: link this user to the caller's company and set the requested role.
    await admin.from('profiles').update({ company_id: companyId }).eq('user_id', newUserId);

    // Map app-roles: admin/employee are valid enum values; cashier/accountant treated as 'employee' enum
    // but stored separately in employees.role for permission resolution? The current useRoleAccess
    // reads context role from user_roles ('admin'|'employee'). For cashier/accountant we still need
    // restricted access. We store the actual functional role in user_roles by extending mapping:
    // here we keep enum-safe value and rely on employees.role for finer mapping.
    const enumRole = role === 'admin' ? 'admin' : 'employee';
    await admin.from('user_roles').update({ role: enumRole }).eq('user_id', newUserId);

    return new Response(JSON.stringify({ user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
