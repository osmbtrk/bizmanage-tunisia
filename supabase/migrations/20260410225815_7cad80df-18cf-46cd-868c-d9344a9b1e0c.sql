
-- Product returns table
CREATE TABLE public.product_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL DEFAULT '',
  return_type TEXT NOT NULL DEFAULT 'reusable',
  credit_note_number TEXT,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company returns" ON public.product_returns FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users insert company returns" ON public.product_returns FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users update company returns" ON public.product_returns FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users delete company returns" ON public.product_returns FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Employé',
  phone TEXT,
  email TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company employees" ON public.employees FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users insert company employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users update company employees" ON public.employees FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users delete company employees" ON public.employees FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employee attendance table
CREATE TABLE public.employee_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  shift TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company attendance" ON public.employee_attendance FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users insert company attendance" ON public.employee_attendance FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users update company attendance" ON public.employee_attendance FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users delete company attendance" ON public.employee_attendance FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
