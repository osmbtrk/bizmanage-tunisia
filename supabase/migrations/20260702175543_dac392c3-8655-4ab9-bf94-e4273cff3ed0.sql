-- Restore EXECUTE on RLS helper functions to authenticated so policies can evaluate.
-- Keep them revoked from PUBLIC and anon.
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Same for the RPC-style helpers used by the app at runtime
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_stock_availability(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated, service_role;