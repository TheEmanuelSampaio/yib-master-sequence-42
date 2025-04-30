
-- Function to get time restriction details for a sequence
CREATE OR REPLACE FUNCTION public.get_sequence_time_restrictions(seq_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  active BOOLEAN,
  days INTEGER[],
  start_hour INTEGER,
  start_minute INTEGER,
  end_hour INTEGER,
  end_minute INTEGER,
  is_global BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.id,
    tr.name,
    tr.active,
    tr.days,
    tr.start_hour,
    tr.start_minute,
    tr.end_hour,
    tr.end_minute,
    TRUE as is_global
  FROM
    time_restrictions tr
  JOIN
    sequence_time_restrictions str ON tr.id = str.time_restriction_id
  WHERE
    str.sequence_id = seq_id
    AND tr.active = true;
END;
$$ LANGUAGE plpgsql;
