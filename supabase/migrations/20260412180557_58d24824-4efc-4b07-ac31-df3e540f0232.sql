
-- Add salary/commission fields to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS base_salary numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS commission_value numeric NOT NULL DEFAULT 0;

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company activity logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users insert company activity logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE INDEX idx_activity_logs_company ON public.activity_logs(company_id);
CREATE INDEX idx_activity_logs_employee ON public.activity_logs(employee_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
