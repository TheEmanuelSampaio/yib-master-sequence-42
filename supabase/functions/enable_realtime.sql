
-- Enable REPLICA IDENTITY FULL for tables
ALTER TABLE public.sequences REPLICA IDENTITY FULL;
ALTER TABLE public.sequence_stages REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
ALTER TABLE public.contact_tags REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sequences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sequence_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_tags;
