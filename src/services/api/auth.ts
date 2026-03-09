import { supabase } from '@/integrations/supabase/client';

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getUser() {
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function fetchProfile(userId: string) {
  return supabase.from('profiles').select('full_name, email, company_id').eq('user_id', userId).single();
}

export async function fetchUserRole(userId: string) {
  return supabase.from('user_roles').select('role').eq('user_id', userId).single();
}
