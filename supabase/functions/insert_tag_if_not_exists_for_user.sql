
CREATE OR REPLACE FUNCTION public.insert_tag_if_not_exists_for_user(
  p_name TEXT,
  p_created_by UUID
) RETURNS VOID AS $$
BEGIN
  -- Tenta inserir a tag apenas se ela não existir para este usuário
  INSERT INTO public.tags (name, created_by)
  SELECT p_name, p_created_by
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tags 
    WHERE name = p_name AND created_by = p_created_by
  );
END;
$$ LANGUAGE plpgsql;
