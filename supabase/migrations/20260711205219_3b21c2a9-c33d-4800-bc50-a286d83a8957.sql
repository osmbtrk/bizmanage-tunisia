
-- ============================================================
-- Restrict DELETE on financial tables to admin role only
-- ============================================================

DROP POLICY IF EXISTS "Users delete company invoices" ON public.invoices;
CREATE POLICY "Admins delete company invoices" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users delete company purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Admins delete company purchase invoices" ON public.purchase_invoices
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users delete company expenses" ON public.expenses;
CREATE POLICY "Admins delete company expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- Split cash_sessions ALL policy: only admins can UPDATE/DELETE
-- Company members can still SELECT/INSERT (open) sessions
-- ============================================================

DROP POLICY IF EXISTS "cash_sessions_company_access" ON public.cash_sessions;

CREATE POLICY "cash_sessions_select" ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "cash_sessions_insert" ON public.cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "cash_sessions_admin_update" ON public.cash_sessions
  FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cash_sessions_admin_delete" ON public.cash_sessions
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- Split cash_movements ALL policy: only admins can DELETE/UPDATE
-- ============================================================

DROP POLICY IF EXISTS "cash_movements_company_access" ON public.cash_movements;

CREATE POLICY "cash_movements_select" ON public.cash_movements
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "cash_movements_insert" ON public.cash_movements
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "cash_movements_admin_update" ON public.cash_movements
  FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cash_movements_admin_delete" ON public.cash_movements
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );
