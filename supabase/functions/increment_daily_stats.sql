
CREATE OR REPLACE FUNCTION public.increment_daily_stats(
  new_contacts INT,
  msgs_scheduled INT,
  msgs_sent INT,
  msgs_failed INT,
  completed_seqs INT,
  date DATE,
  instance_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserir ou atualizar estatística diária
  INSERT INTO public.daily_stats (
    new_contacts,
    messages_scheduled,
    messages_sent,
    messages_failed,
    completed_sequences,
    date,
    instance_id
  )
  VALUES (
    new_contacts,
    msgs_scheduled,
    msgs_sent,
    msgs_failed,
    completed_seqs,
    date,
    instance_id
  )
  ON CONFLICT (date, instance_id)
  DO UPDATE SET
    new_contacts = daily_stats.new_contacts + EXCLUDED.new_contacts,
    messages_scheduled = daily_stats.messages_scheduled + EXCLUDED.messages_scheduled,
    messages_sent = daily_stats.messages_sent + EXCLUDED.messages_sent,
    messages_failed = daily_stats.messages_failed + EXCLUDED.messages_failed,
    completed_sequences = daily_stats.completed_sequences + EXCLUDED.completed_sequences;
END;
$$;
