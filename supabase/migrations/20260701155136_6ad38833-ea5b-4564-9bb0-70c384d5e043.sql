
-- 1) Profile company_id escalation fix
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IS NOT DISTINCT FROM public.get_user_company_id(auth.uid())
  );

-- 2) Fix cash_sessions / cash_movements policies (profiles.id -> profiles.user_id)
DROP POLICY IF EXISTS cash_sessions_company_access ON public.cash_sessions;
CREATE POLICY cash_sessions_company_access ON public.cash_sessions
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS cash_movements_company_access ON public.cash_movements;
CREATE POLICY cash_movements_company_access ON public.cash_movements
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 3) Storage: remove overly broad archive policies, add company-scoped delete
DROP POLICY IF EXISTS "Public read archives" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload archives" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete archives" ON storage.objects;

CREATE POLICY "Company users can delete archives" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'archives'
    AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
  );

-- 4) Revoke execute on SECURITY DEFINER helpers from anon; keep authenticated where needed
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_stock_not_negative() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.next_document_number(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_stock_availability(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_stock_availability(jsonb) TO authenticated;
