
-- Function to get user IDs and emails from auth.users
-- This function should be executed with service_role credentials
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
RETURNS TABLE (id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super_admins to access this data
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized access. Only super admins can query user emails.';
  END IF;

  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_emails() TO authenticated;
