
-- 1. Atomic stock adjustment function (returns new stock, raises error if negative)
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_stock integer;
BEGIN
  UPDATE products
  SET stock = stock + _delta
  WHERE id = _product_id
  RETURNING stock INTO _new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', _product_id;
  END IF;

  IF _new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product %: would be %', _product_id, _new_stock;
  END IF;

  RETURN _new_stock;
END;
$$;

-- 2. Batch stock validation function (checks all items before any deduction)
CREATE OR REPLACE FUNCTION public.validate_stock_availability(_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item jsonb;
  _current_stock integer;
  _product_name text;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    SELECT stock, name INTO _current_stock, _product_name
    FROM products
    WHERE id = (_item->>'product_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', _item->>'product_id';
    END IF;

    IF _current_stock < (_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'Stock insuffisant pour %: disponible %, demandé %',
        _product_name, _current_stock, (_item->>'quantity')::integer;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- 3. Unique index on invoice numbers (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_company_number ON public.invoices (company_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_invoices_company_number ON public.purchase_invoices (company_id, number);

-- 4. DB-level trigger to prevent negative stock
CREATE OR REPLACE FUNCTION public.check_stock_not_negative()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative for product %: attempted value %', NEW.name, NEW.stock;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_stock_not_negative
  BEFORE UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_not_negative();

-- 5. Add updated_at triggers (was missing from all tables)
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
