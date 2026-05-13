
-- Add user_id link on employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Configurable return deadline per company
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS return_deadline_days integer NOT NULL DEFAULT 15;

-- Track full-invoice returns and link
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS is_full_return boolean NOT NULL DEFAULT false;

-- Allow admins to insert/update/delete user_roles for users in their company
CREATE POLICY "Admins manage roles in company"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins update roles in company"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins delete roles in company"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = public.get_user_company_id(auth.uid())
  )
);
