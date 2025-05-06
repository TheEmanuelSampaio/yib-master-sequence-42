

-- Trigger para manter as condições antigas da sequência em sincronia com as novas estruturas complexas

-- Função que será chamada pelo trigger para atualizar as colunas antigas quando as novas tabelas são modificadas
CREATE OR REPLACE FUNCTION update_sequence_conditions()
RETURNS TRIGGER AS $$
DECLARE
    start_groups RECORD;
    stop_groups RECORD;
    start_tags TEXT[] := '{}';
    stop_tags TEXT[] := '{}';
    start_type TEXT;
    stop_type TEXT;
BEGIN
    -- Para condições de início (start)
    SELECT string_agg(tag_name, ',') as tags, g.group_operator as operator
    INTO start_groups
    FROM sequence_condition_tags t
    JOIN sequence_condition_groups g ON t.group_id = g.id
    WHERE g.sequence_id = NEW.sequence_id AND g.condition_type = 'start'
    GROUP BY g.id, g.group_operator
    LIMIT 1;

    -- Para condições de parada (stop)
    SELECT string_agg(tag_name, ',') as tags, g.group_operator as operator
    INTO stop_groups
    FROM sequence_condition_tags t
    JOIN sequence_condition_groups g ON t.group_id = g.id
    WHERE g.sequence_id = NEW.sequence_id AND g.condition_type = 'stop'
    GROUP BY g.id, g.group_operator
    LIMIT 1;

    -- Prepara os arrays e tipos
    IF start_groups IS NOT NULL THEN
        start_tags := string_to_array(start_groups.tags, ',');
        start_type := start_groups.operator;
    ELSE
        start_type := 'OR';
    END IF;

    IF stop_groups IS NOT NULL THEN
        stop_tags := string_to_array(stop_groups.tags, ',');
        stop_type := stop_groups.operator;
    ELSE
        stop_type := 'OR';
    END IF;

    -- Atualiza a tabela de sequências com os dados das condições complexas
    UPDATE sequences
    SET 
        start_condition_tags = start_tags,
        start_condition_type = start_type,
        stop_condition_tags = stop_tags,
        stop_condition_type = stop_type
    WHERE id = NEW.sequence_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para quando uma nova tag é adicionada
CREATE TRIGGER on_condition_tag_change
AFTER INSERT OR UPDATE OR DELETE ON sequence_condition_tags
FOR EACH ROW
EXECUTE FUNCTION update_sequence_conditions();

-- Trigger para quando um grupo é alterado
CREATE TRIGGER on_condition_group_change
AFTER INSERT OR UPDATE OR DELETE ON sequence_condition_groups
FOR EACH ROW
EXECUTE FUNCTION update_sequence_conditions();

