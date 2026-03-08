
-- UPDATE policy for invoice_items
CREATE POLICY "Users update company invoice items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.company_id = get_user_company_id(auth.uid())
  )
);

-- UPDATE policy for expenses
CREATE POLICY "Users update company expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- UPDATE policy for stock_movements
CREATE POLICY "Users update company stock movements"
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- DELETE policy for stock_movements (needed for corrections)
CREATE POLICY "Users delete company stock movements"
ON public.stock_movements
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));
