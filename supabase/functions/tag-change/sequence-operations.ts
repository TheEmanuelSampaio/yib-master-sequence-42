
export async function processSequences(supabase, clientId, contactId, tags, variables = {}) {
  console.log(`[5.1 SEQUÊNCIAS] Iniciando processamento de sequências para o contato ${contactId} com tags: ${JSON.stringify(tags)}`);
  console.log(`[5.1 SEQUÊNCIAS] Filtrando sequências para o client_id: ${clientId}`);
  console.log(`[5.1 VARIÁVEIS] Processando variáveis recebidas: ${JSON.stringify(variables || {})}`);
  
  try {
    // Passo 1: Buscar todas as sequências ativas deste cliente específico
    // Primeiro buscar todas as instâncias deste cliente
    const { data: instances, error: instancesError } = await supabase
      .from("instances")
      .select("id")
      .eq("client_id", clientId);
      
    if (instancesError) {
      console.error(`[5.2 SEQUÊNCIAS] Erro ao buscar instâncias do cliente: ${instancesError.message}`);
      return {
        success: false,
        error: `Erro ao buscar instâncias: ${instancesError.message}`
      };
    }
    
    if (!instances || instances.length === 0) {
      console.log(`[5.2 SEQUÊNCIAS] Nenhuma instância encontrada para o cliente ${clientId}.`);
      return {
        success: true,
        sequencesProcessed: 0,
        sequencesAdded: 0,
        sequencesSkipped: 0
      };
    }
    
    // Extrair os IDs das instâncias
    const instanceIds = instances.map(instance => instance.id);
    console.log(`[5.2 SEQUÊNCIAS] Encontradas ${instanceIds.length} instâncias para o cliente ${clientId}.`);
    
    // Buscar sequências usando os IDs das instâncias
    const { data: sequences, error: sequencesError } = await supabase
      .from("sequences")
      .select(`
        id,
        name,
        instance_id,
        start_condition_type,
        start_condition_tags,
        stop_condition_type,
        stop_condition_tags,
        status,
        created_by,
        sequence_stages (
          id,
          name,
          type,
          content,
          typebot_stage,
          delay,
          delay_unit,
          order_index
        )
      `)
      .eq("status", "active")
      .in("instance_id", instanceIds)
      .order("created_at", { ascending: false });

    if (sequencesError) {
      console.error(`[5.2 SEQUÊNCIAS] Erro ao buscar sequências ativas: ${sequencesError.message}`);
      return {
        success: false,
        error: `Erro ao buscar sequências: ${sequencesError.message}`
      };
    }

    if (!sequences || sequences.length === 0) {
      console.log(`[5.2 SEQUÊNCIAS] Nenhuma sequência ativa encontrada para o cliente ${clientId}.`);
      return {
        success: true,
        sequencesProcessed: 0,
        sequencesAdded: 0,
        sequencesSkipped: 0
      };
    }

    console.log(`[5.2 SEQUÊNCIAS] Encontradas ${sequences.length} sequências ativas para o cliente ${clientId}.`);

    // Passo 2: Filtrar aquelas onde o contato atende as condições de start e não atende as de stop
    const eligibleSequences = sequences.filter(sequence => {
      // Normalizando as tags do contato para comparação consistente
      const normalizedContactTags = tags.map(tag => tag.toLowerCase().trim());
      
      // Debug da sequência sendo avaliada
      console.log(`[5.3 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Avaliando elegibilidade`);
      console.log(`[5.3 SEQUÊNCIA ${sequence.id}] Condição de início: tipo=${sequence.start_condition_type}, tags=${JSON.stringify(sequence.start_condition_tags)}`);
      console.log(`[5.3 SEQUÊNCIA ${sequence.id}] Condição de parada: tipo=${sequence.stop_condition_type}, tags=${JSON.stringify(sequence.stop_condition_tags)}`);
      console.log(`[5.3 SEQUÊNCIA ${sequence.id}] Tags do contato: ${JSON.stringify(normalizedContactTags)}`);
      
      const matchesStart = evaluateCondition(sequence.start_condition_type, sequence.start_condition_tags, normalizedContactTags);
      const matchesStop = evaluateCondition(sequence.stop_condition_type, sequence.stop_condition_tags, normalizedContactTags);
      
      const isEligible = matchesStart && !matchesStop;
      console.log(`[5.3 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Elegibilidade: matchesStart=${matchesStart}, matchesStop=${matchesStop}, isEligible=${isEligible}`);
      
      return isEligible;
    });

    console.log(`[5.3 SEQUÊNCIAS] ${eligibleSequences.length} sequências elegíveis para o contato com tags: ${JSON.stringify(tags)}`);

    // Passo 3: Para cada sequência elegível, verificar se o contato já está na sequência
    let sequencesAdded = 0;
    let sequencesSkipped = 0;
    
    for (const sequence of eligibleSequences) {
      console.log(`[5.4 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Verificando se o contato já está na sequência...`);
      
      const { data: existingContactSequence, error: contactSequenceError } = await supabase
        .from("contact_sequences")
        .select("id, status, current_stage_index")
        .eq("contact_id", contactId)
        .eq("sequence_id", sequence.id)
        .in("status", ["active", "paused"])
        .maybeSingle();

      if (contactSequenceError) {
        console.error(`[5.4 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Erro ao verificar contato na sequência: ${contactSequenceError.message}`);
        continue;
      }

      if (existingContactSequence) {
        console.log(`[5.4 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Contato já está na sequência com status ${existingContactSequence.status}`);
        sequencesSkipped++;
        continue;
      }

      // Garantir que sequence.sequence_stages seja tratado como array
      const sequenceStages = Array.isArray(sequence.sequence_stages) 
        ? sequence.sequence_stages 
        : [];
        
      // Ordenar estágios por order_index
      const sortedStages = [...sequenceStages].sort((a, b) => a.order_index - b.order_index);
      
      if (sortedStages.length === 0) {
        console.log(`[5.4 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Sequência não tem estágios, pulando...`);
        sequencesSkipped++;
        continue;
      }

      const firstStage = sortedStages[0];

      console.log(`[5.5 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Adicionando contato à sequência, primeiro estágio: ${firstStage.id} - "${firstStage.name}"`);

      // Adicionar o contato à sequência
      const { data: newContactSequence, error: insertError } = await supabase
        .from("contact_sequences")
        .insert({
          contact_id: contactId,
          sequence_id: sequence.id,
          status: "active",
          current_stage_index: 0,
          current_stage_id: firstStage.id
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[5.5 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Erro ao adicionar contato à sequência: ${insertError.message}`);
        continue;
      }

      console.log(`[5.5 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Contato adicionado com sucesso à sequência: ${newContactSequence.id}`);

      // Adicionar registros de stage_progress para todos os estágios
      const stageProgressRecords = sortedStages.map((stage, index) => ({
        contact_sequence_id: newContactSequence.id,
        stage_id: stage.id,
        status: index === 0 ? "pending" : "pending"
      }));

      const { error: stageProgressError } = await supabase
        .from("stage_progress")
        .insert(stageProgressRecords);

      if (stageProgressError) {
        console.error(`[5.6 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Erro ao criar registros de progresso de estágio: ${stageProgressError.message}`);
      } else {
        console.log(`[5.6 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Criados ${stageProgressRecords.length} registros de progresso de estágio`);
      }

      // Calcular tempo de delay para a primeira mensagem
      const delay = calculateDelayInMinutes(firstStage.delay, firstStage.delay_unit);
      console.log(`[5.7 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Delay calculado para o primeiro estágio: ${delay} minutos`);
      
      // Calcular horário de envio
      const scheduledTime = new Date();
      scheduledTime.setMinutes(scheduledTime.getMinutes() + delay);
      const rawScheduledTime = scheduledTime.toISOString();
      
      // Verificar restrições de tempo
      const { data: timeRestrictions, error: restrictionsError } = await supabase.rpc(
        "get_sequence_time_restrictions",
        { seq_id: sequence.id }
      );

      if (restrictionsError) {
        console.error(`[5.7 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Erro ao obter restrições de tempo: ${restrictionsError.message}`);
      }
      
      // Garantir que timeRestrictions é um array, mesmo que seja null
      const restrictions = Array.isArray(timeRestrictions) ? timeRestrictions : [];
      
      const { adjustedTime, wasAdjusted } = applyTimeRestrictions(
        scheduledTime,
        restrictions
      );
      
      if (wasAdjusted) {
        console.log(`[5.7 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Horário ajustado devido a restrições de tempo: ${adjustedTime.toISOString()}`);
      }
      
      // Processar variáveis no conteúdo antes de agendar a mensagem
      const { processedContent, processedVariables } = processVariables(firstStage.type, firstStage.content, variables);
      
      // Agendar a mensagem
      const { data: scheduledMessage, error: scheduleError } = await supabase
        .from("scheduled_messages")
        .insert({
          contact_id: contactId,
          sequence_id: sequence.id,
          stage_id: firstStage.id,
          scheduled_time: adjustedTime.toISOString(),
          raw_scheduled_time: rawScheduledTime,
          status: "pending",
          variables: variables || {}, // Armazenar as variáveis recebidas
          processed_content: processedContent // Armazenar o conteúdo processado com variáveis
        })
        .select()
        .single();

      if (scheduleError) {
        console.error(`[5.8 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Erro ao agendar primeira mensagem: ${scheduleError.message}`);
      } else {
        console.log(`[5.8 SEQUÊNCIA ${sequence.id} - "${sequence.name}"] Primeira mensagem agendada com sucesso: ${scheduledMessage.id}`);
        // Log das variáveis processadas
        console.log(`[5.8 VARIÁVEIS] Mensagem agendada com variáveis: ${JSON.stringify(variables || {})}`);
        console.log(`[5.8 VARIÁVEIS] Conteúdo original: ${firstStage.content}`);
        console.log(`[5.8 VARIÁVEIS] Conteúdo processado: ${processedContent}`);
      }

      // Incrementar contador de estatísticas diárias
      const { data: instance } = await supabase
        .from("instances")
        .select("id")
        .eq("id", sequence.instance_id)
        .single();

      if (instance) {
        await supabase.rpc("increment_daily_stats", {
          instance_id: instance.id,
          messages_scheduled_count: 1
        });
      }

      sequencesAdded++;
    }

    console.log(`[5.9 SEQUÊNCIAS] Processamento concluído: ${sequencesAdded} sequências adicionadas, ${sequencesSkipped} sequências puladas`);
    
    return {
      success: true,
      sequencesProcessed: eligibleSequences.length,
      sequencesAdded,
      sequencesSkipped
    };
    
  } catch (error) {
    console.error(`[5.X SEQUÊNCIAS] Erro não tratado: ${error.message}`);
    console.error(`[5.X SEQUÊNCIAS] Stack trace: ${error.stack || 'No stack trace available'}`);
    return {
      success: false,
      error: `Erro ao processar sequências: ${error.message}`
    };
  }
}

// Função para processar variáveis no conteúdo da mensagem
function processVariables(type, content, variables = {}) {
  console.log(`[VARIÁVEIS] Processando variáveis para conteúdo do tipo ${type}`);
  console.log(`[VARIÁVEIS] Variáveis disponíveis: ${JSON.stringify(variables)}`);

  // Se não houver variáveis, retornar o conteúdo original
  if (!variables || Object.keys(variables).length === 0) {
    console.log(`[VARIÁVEIS] Nenhuma variável disponível, retornando conteúdo original`);
    return { 
      processedContent: content,
      processedVariables: {} 
    };
  }

  let processedContent = content;
  
  if (type === "message" || type === "pattern") {
    // Substituir variáveis no formato {variable_name}
    processedContent = content.replace(/\{([^}]+)\}/g, (match, variableName) => {
      if (variables && variables[variableName] !== undefined) {
        console.log(`[VARIÁVEIS] Substituindo ${variableName} por ${variables[variableName]}`);
        return variables[variableName];
      } else {
        console.log(`[VARIÁVEIS] Variável ${variableName} não encontrada, substituindo por string vazia`);
        return ''; // Substituir por string vazia se a variável não existir
      }
    });
    
    console.log(`[VARIÁVEIS] Conteúdo após substituição: ${processedContent}`);
    
  } else if (type === "typebot") {
    // Para typebot, incluir as variáveis no payload
    try {
      // Verificar se o conteúdo já é um objeto JSON
      let typebotPayload;
      try {
        typebotPayload = JSON.parse(content);
      } catch (e) {
        // Se não for um JSON válido, usar o conteúdo como está
        typebotPayload = { url: content };
      }
      
      // Adicionar as variáveis ao payload
      typebotPayload.variables = variables;
      typebotPayload.stage = content; // Manter o conteúdo original como estágio
      
      processedContent = JSON.stringify(typebotPayload);
      console.log(`[VARIÁVEIS] Payload typebot gerado: ${processedContent}`);
      
    } catch (error) {
      console.error(`[VARIÁVEIS] Erro ao processar payload do typebot: ${error.message}`);
      processedContent = content; // Em caso de erro, manter o conteúdo original
    }
  }
  
  return {
    processedContent,
    processedVariables: variables
  };
}

function evaluateCondition(conditionType, conditionTags, userTags) {
  if (!conditionTags || conditionTags.length === 0) {
    // Se não houver tags na condição, considerar que atende
    console.log(`[CONDITION] Condição sem tags, considerada como atendida`);
    return true;
  }

  if (!userTags || userTags.length === 0) {
    // Se o usuário não tiver tags, ele não atende a nenhuma condição com tags
    console.log(`[CONDITION] Usuário sem tags, condição não atendida`);
    return false;
  }

  // Normalizar as tags para comparação
  const normalizedConditionTags = conditionTags.map(tag => String(tag).toLowerCase().trim());
  const normalizedUserTags = userTags.map(tag => String(tag).toLowerCase().trim());
  
  console.log(`[CONDITION] Condição tipo=${conditionType}, tags normalizadas: ${JSON.stringify(normalizedConditionTags)}`);
  console.log(`[CONDITION] Tags do contato normalizadas: ${JSON.stringify(normalizedUserTags)}`);

  if (conditionType === "AND") {
    // Todas as tags da condição devem estar presentes
    const result = normalizedConditionTags.every(tag => normalizedUserTags.includes(tag));
    console.log(`[CONDITION] Avaliação AND: ${result ? "ATENDIDA" : "NÃO ATENDIDA"}`);
    
    // Log detalhado de cada tag verificada
    normalizedConditionTags.forEach(tag => {
      const matched = normalizedUserTags.includes(tag);
      console.log(`[CONDITION] Tag '${tag}' ${matched ? "encontrada" : "NÃO encontrada"} nas tags do contato`);
    });
    
    return result;
  } else {
    // Pelo menos uma tag da condição deve estar presente
    const result = normalizedConditionTags.some(tag => normalizedUserTags.includes(tag));
    console.log(`[CONDITION] Avaliação OR: ${result ? "ATENDIDA" : "NÃO ATENDIDA"}`);
    
    // Log detalhado de cada tag verificada
    normalizedConditionTags.forEach(tag => {
      const matched = normalizedUserTags.includes(tag);
      console.log(`[CONDITION] Tag '${tag}' ${matched ? "encontrada" : "NÃO encontrada"} nas tags do contato`);
    });
    
    return result;
  }
}

function calculateDelayInMinutes(delay, delayUnit) {
  switch (delayUnit) {
    case "minutes":
      return delay;
    case "hours":
      return delay * 60;
    case "days":
      return delay * 24 * 60;
    default:
      return delay;
  }
}

function applyTimeRestrictions(scheduledTime, restrictions) {
  // Se não houver restrições, retornar o horário original
  if (!restrictions || restrictions.length === 0) {
    return { adjustedTime: scheduledTime, wasAdjusted: false };
  }
  
  const scheduledDate = new Date(scheduledTime);
  let wasAdjusted = false;

  // Loop para verificar todas as restrições
  for (let i = 0; i < 100; i++) { // Limite de 100 iterações para evitar loops infinitos
    let needsAdjustment = false;
    
    for (const restriction of restrictions) {
      // Verificar se a restrição está ativa
      if (!restriction.active) continue;
      
      const dayOfWeek = scheduledDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      const hour = scheduledDate.getHours();
      const minute = scheduledDate.getMinutes();
      
      // Verificar se o dia atual está na lista de dias restritos
      if (restriction.days.includes(dayOfWeek)) {
        // Verificar se o horário atual está dentro do intervalo restrito
        const timeInMinutes = hour * 60 + minute;
        const startTimeInMinutes = restriction.start_hour * 60 + restriction.start_minute;
        const endTimeInMinutes = restriction.end_hour * 60 + restriction.end_minute;
        
        if (timeInMinutes >= startTimeInMinutes && timeInMinutes <= endTimeInMinutes) {
          // Horário cai em uma restrição, precisa ser ajustado
          needsAdjustment = true;
          break;
        }
      }
    }
    
    if (needsAdjustment) {
      // Avançar o horário para o próximo dia, às 9h da manhã
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(9, 0, 0, 0);
      wasAdjusted = true;
    } else {
      // Horário não cai em nenhuma restrição, pode ser usado
      break;
    }
  }

  return { adjustedTime: scheduledDate, wasAdjusted };
}
