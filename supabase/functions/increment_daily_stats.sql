
CREATE OR REPLACE FUNCTION public.increment_daily_stats(
  instance_id UUID,
  stat_date DATE,
  completed_seqs INTEGER DEFAULT 0,
  msgs_sent INTEGER DEFAULT 0,
  msgs_failed INTEGER DEFAULT 0,
  msgs_scheduled INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id UUID;
BEGIN
  -- Verificar se já existe um registro para esta instância e data
  SELECT id INTO stats_id
  FROM public.daily_stats
  WHERE instance_id = increment_daily_stats.instance_id
    AND date = increment_daily_stats.stat_date;

  IF stats_id IS NULL THEN
    -- Se não existe, criar um novo registro
    INSERT INTO public.daily_stats (
      instance_id, 
      date, 
      completed_sequences, 
      messages_sent, 
      messages_failed, 
      messages_scheduled, 
      new_contacts
    )
    VALUES (
      increment_daily_stats.instance_id,
      increment_daily_stats.stat_date,
      increment_daily_stats.completed_seqs,
      increment_daily_stats.msgs_sent,
      increment_daily_stats.msgs_failed,
      increment_daily_stats.msgs_scheduled,
      increment_daily_stats.new_contacts
    );
  ELSE
    -- Se já existe, incrementar os valores
    UPDATE public.daily_stats
    SET 
      completed_sequences = daily_stats.completed_sequences + increment_daily_stats.completed_seqs,
      messages_sent = daily_stats.messages_sent + increment_daily_stats.msgs_sent,
      messages_failed = daily_stats.messages_failed + increment_daily_stats.msgs_failed,
      messages_scheduled = daily_stats.messages_scheduled + increment_daily_stats.msgs_scheduled,
      new_contacts = daily_stats.new_contacts + increment_daily_stats.new_contacts
    WHERE id = stats_id;
  END IF;
END;
$$;
