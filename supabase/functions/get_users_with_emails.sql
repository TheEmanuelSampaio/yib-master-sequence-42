
-- Função para buscar usuários com emails (apenas para super_admin)
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
RETURNS TABLE (
  id uuid,
  email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é super_admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' THEN
    RETURN QUERY
      SELECT u.id, u.email
      FROM auth.users u;
  ELSE
    -- Retornar apenas o usuário atual se não for super_admin
    RETURN QUERY
      SELECT u.id, u.email
      FROM auth.users u
      WHERE u.id = auth.uid();
  END IF;
END;
$$;

-- Garantir que apenas usuários autenticados possam chamar esta função
REVOKE EXECUTE ON FUNCTION public.get_users_with_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_with_emails() TO authenticated;
