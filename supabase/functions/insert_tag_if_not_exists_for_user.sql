
CREATE OR REPLACE FUNCTION public.insert_tag_if_not_exists_for_user(
  p_name TEXT,
  p_created_by UUID
) RETURNS VOID AS $$
BEGIN
  -- Se o usuário for o sistema (UUID zerado), usar um usuário válido da tabela profiles
  DECLARE
    valid_user UUID;
  BEGIN
    IF p_created_by = '00000000-0000-0000-0000-000000000000' THEN
      -- Obter um usuário válido do sistema
      SELECT id INTO valid_user FROM auth.users LIMIT 1;
      
      -- Se não encontrou nenhum usuário válido, não faz nada
      IF valid_user IS NULL THEN
        RETURN;
      END IF;
      
      -- Tenta inserir a tag apenas se ela não existir
      INSERT INTO public.tags (name, created_by)
      SELECT p_name, valid_user
      WHERE NOT EXISTS (
        SELECT 1 FROM public.tags 
        WHERE name = p_name
      );
    ELSE
      -- Comportamento original para usuários normais
      INSERT INTO public.tags (name, created_by)
      SELECT p_name, p_created_by
      WHERE NOT EXISTS (
        SELECT 1 FROM public.tags 
        WHERE name = p_name AND created_by = p_created_by
      );
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;
