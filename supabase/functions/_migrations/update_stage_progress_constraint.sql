
-- Atualizar a constraint da tabela stage_progress para incluir o valor "removed"
ALTER TABLE stage_progress DROP CONSTRAINT IF EXISTS stage_progress_status_check;
ALTER TABLE stage_progress ADD CONSTRAINT stage_progress_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'skipped', 'removed', 'failed'));
