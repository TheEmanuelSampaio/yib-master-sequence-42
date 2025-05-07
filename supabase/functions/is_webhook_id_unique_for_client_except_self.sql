
CREATE OR REPLACE FUNCTION public.is_webhook_id_unique_for_client_except_self(p_webhook_id text, p_instance_id uuid, p_sequence_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  client_id_var UUID;
  exists_var BOOLEAN;
BEGIN
  -- Get the client_id from the instance
  SELECT client_id INTO client_id_var FROM instances WHERE id = p_instance_id;
  
  -- Check if the webhook_id already exists for any instance associated with this client
  -- EXCLUDING the sequence we're currently editing
  SELECT EXISTS(
    SELECT 1 
    FROM sequences s
    JOIN instances i ON s.instance_id = i.id
    WHERE i.client_id = client_id_var
    AND s.webhook_id = p_webhook_id
    AND s.webhook_enabled = true
    AND s.id != p_sequence_id  -- Exclude the current sequence being edited
  ) INTO exists_var;
  
  -- Return true if unique (not exists), false otherwise
  RETURN NOT exists_var;
END;
$function$;
