
-- SQL para remover a constraint que impede múltiplas entradas do mesmo contato em uma sequência
ALTER TABLE IF EXISTS public.contact_sequences DROP CONSTRAINT IF EXISTS contact_sequences_contact_id_sequence_id_key;
