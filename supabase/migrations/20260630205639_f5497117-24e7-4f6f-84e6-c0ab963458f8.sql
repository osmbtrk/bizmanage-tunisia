CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric(14,3) NOT NULL DEFAULT 0,
  closing_balance numeric(14,3),
  expected_balance numeric(14,3),
  difference numeric(14,3),
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_sessions_company_access" ON public.cash_sessions
  FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cash_sessions_company ON public.cash_sessions(company_id, opened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_open_unique
  ON public.cash_sessions(company_id) WHERE status = 'open';

CREATE TRIGGER update_cash_sessions_updated_at BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale','expense','cash_in','cash_out')),
  amount numeric(14,3) NOT NULL,
  reference text,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_movements_company_access" ON public.cash_movements
  FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_company ON public.cash_movements(company_id, created_at DESC);