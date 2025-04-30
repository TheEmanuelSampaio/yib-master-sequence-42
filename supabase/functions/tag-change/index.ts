
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("[INIT] Inicializando função tag-change");

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verificar se é POST e analisar o corpo da requisição
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // [1. BODY RECEBIDO] - Parse do body
    const body = await req.text();
    console.log(`[1. BODY] Body recebido: ${body}`);
    
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log(`[1. BODY] JSON parseado com sucesso`);
    } catch (parseError) {
      console.error(`[1. BODY] Erro ao parsear JSON: ${parseError.message}`);
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados relevantes - suportar ambos os formatos (retrocompatibilidade)
    let chatwootData = null;
    
    // Formato 1: { body: { chatwootData: {...} } }
    if (jsonData.body && jsonData.body.chatwootData) {
      chatwootData = jsonData.body.chatwootData;
      console.log(`[1. BODY] Formato utilizado: body.chatwootData`);
    } 
    // Formato 2: { chatwootData: {...} } 
    else if (jsonData.chatwootData) {
      chatwootData = jsonData.chatwootData;
      console.log(`[1. BODY] Formato utilizado: chatwootData direto`);
    } 
    // Formato 3: { data: {...} } onde data contém os dados diretos
    else if (jsonData.data) {
      chatwootData = jsonData.data;
      console.log(`[1. BODY] Formato utilizado: data direto`);
    }
    
    if (!chatwootData) {
      console.error(`[1. BODY] Dados do Chatwoot ausentes`, JSON.stringify(jsonData));
      return new Response(
        JSON.stringify({ 
          error: 'Dados do Chatwoot ausentes', 
          formatoEsperado: {
            "opção 1": { "body": { "chatwootData": { "accountData": {}, "contactData": {}, "conversationData": {} } } },
            "opção 2": { "chatwootData": { "accountData": {}, "contactData": {}, "conversationData": {} } },
            "opção 3": { "data": { "accountData": {}, "contactData": {}, "conversationData": {} } }
          },
          recebido: jsonData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { accountData, contactData, conversationData } = chatwootData;
    
    if (!accountData || !contactData || !conversationData) {
      console.error(`[1. BODY] Dados incompletos no payload:`, JSON.stringify({
        temAccountData: !!accountData,
        temContactData: !!contactData,
        temConversationData: !!conversationData
      }));
      return new Response(
        JSON.stringify({ 
          error: 'Dados incompletos', 
          detalhes: {
            temAccountData: !!accountData,
            temContactData: !!contactData,
            temConversationData: !!conversationData
          },
          recebido: chatwootData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados do contato
    const { id: contactId, name, phoneNumber } = contactData;
    const { inboxId, conversationId, displayId, labels: labelsString } = conversationData;
    const { accountId, accountName } = accountData;

    console.log(`[1. BODY] Processando dados: contactId=${contactId}, name=${name}, phoneNumber=${phoneNumber}, accountId=${accountId}, accountName=${accountName}, tags=${labelsString}`);

    // [2. VERIFICAÇÃO DO CLIENTE] - Verificar se já existe um cliente para essa conta Chatwoot
    console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}"`);
    let { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id, account_name, created_by')
      .eq('account_id', accountId)
      .maybeSingle();

    if (clientError) {
      console.error(`[2. CLIENTE] Erro ao buscar cliente: ${clientError.message}`);
    }

    if (!existingClient) {
      // Criar cliente se não existir
      console.log(`[2. CLIENTE] Cliente não encontrado para accountId=${accountId}. Criando novo cliente...`);
      
      const { data: createdClient, error: createError } = await supabase
        .from('clients')
        .insert({
          account_id: accountId,
          account_name: accountName,
          created_by: '00000000-0000-0000-0000-000000000000', // Sistema
          creator_account_name: 'Sistema'
        })
        .select('id, account_name, created_by')
        .single();

      if (createError) {
        console.error(`[2. CLIENTE] Erro ao criar cliente: ${createError.message}`);
        throw createError;
      }

      existingClient = createdClient;
      console.log(`[2. CLIENTE] Cliente criado com sucesso: id=${existingClient.id}, accountName=${existingClient.account_name}, createdBy=${existingClient.created_by}`);
    } else {
      console.log(`[2. CLIENTE] Cliente encontrado: id=${existingClient.id}, accountName=${existingClient.account_name}, createdBy=${existingClient.created_by}`);
    }

    // [3. VERIFICAÇÃO DO CONTATO] - Verificar se o contato já existe
    console.log(`[3. CONTATO] Verificando existência do contato id=${contactId}`);
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId.toString())
      .maybeSingle();

    if (contactError) {
      console.error(`[3. CONTATO] Erro ao buscar contato: ${contactError.message}`);
    }

    // Criar ou atualizar contato
    if (!existingContact) {
      // Criar contato
      console.log(`[3. CONTATO] Contato id=${contactId} não encontrado. Criando novo contato...`);
      
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert({
          id: contactId.toString(),
          name,
          phone_number: phoneNumber,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId,
          client_id: existingClient.id
        })
        .select('id')
        .single();

      if (createContactError) {
        console.error(`[3. CONTATO] Erro ao criar contato: ${createContactError.message}`);
        throw createContactError;
      }

      console.log(`[3. CONTATO] Contato criado com sucesso: id=${contactId}`);

      // Incrementar contadores de estatísticas
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar todas as instâncias do cliente
      const { data: instances } = await supabase
        .from('instances')
        .select('id')
        .eq('client_id', existingClient.id);
        
      if (instances && instances.length > 0) {
        console.log(`[3. CONTATO] Atualizando estatísticas para ${instances.length} instância(s)`);
        for (const instance of instances) {
          const { error: statsError } = await supabase.rpc('increment_daily_stats', {
            instance_id: instance.id,
            stat_date: today,
            completed_seqs: 0,
            msgs_sent: 0,
            msgs_failed: 0,
            msgs_scheduled: 0,
            new_contacts: 1
          });
          
          if (statsError) {
            console.error(`[3. CONTATO] Erro ao atualizar estatísticas para instância ${instance.id}: ${statsError.message}`);
          } else {
            console.log(`[3. CONTATO] Estatísticas atualizadas para instância ${instance.id}`);
          }
        }
      } else {
        console.log(`[3. CONTATO] Nenhuma instância encontrada para atualizar estatísticas`);
      }
    } else {
      // Atualizar contato se necessário
      console.log(`[3. CONTATO] Contato id=${contactId} encontrado. Atualizando dados...`);
      
      const { data: updatedContact, error: updateContactError } = await supabase
        .from('contacts')
        .update({
          name,
          phone_number: phoneNumber,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId
        })
        .eq('id', contactId.toString())
        .select('id')
        .single();

      if (updateContactError) {
        console.error(`[3. CONTATO] Erro ao atualizar contato: ${updateContactError.message}`);
        throw updateContactError;
      }

      console.log(`[3. CONTATO] Contato atualizado com sucesso: id=${contactId}`);
    }

    // [4. PROCESSAMENTO DE TAGS] - Processar tags (labels)
    console.log(`[4. TAGS] Processando tags: "${labelsString}"`);
    const tags = labelsString ? labelsString.split(',').map(tag => tag.trim()) : [];
    
    // Buscar todas as tags atuais do contato
    const { data: existingTags, error: tagsError } = await supabase
      .from('contact_tags')
      .select('tag_name')
      .eq('contact_id', contactId.toString());
      
    if (tagsError) {
      console.error(`[4. TAGS] Erro ao buscar tags existentes: ${tagsError.message}`);
    }
    
    const currentTags = existingTags ? existingTags.map(t => t.tag_name) : [];
    console.log(`[4. TAGS] Tags atuais do contato: ${JSON.stringify(currentTags)}`);
    console.log(`[4. TAGS] Novas tags a processar: ${JSON.stringify(tags)}`);
    
    // Tags a serem adicionadas (estão na nova lista mas não na atual)
    const tagsToAdd = tags.filter(tag => !currentTags.includes(tag));
    console.log(`[4. TAGS] Tags a adicionar ao contato: ${JSON.stringify(tagsToAdd)}`);
    
    // Tags a serem removidas (estão na lista atual mas não na nova)
    const tagsToRemove = currentTags.filter(tag => !tags.includes(tag));
    console.log(`[4. TAGS] Tags a remover do contato: ${JSON.stringify(tagsToRemove)}`);
    
    // Buscar usuário para criação de tags - usar o criador do cliente
    const createdBy = existingClient.created_by;
    console.log(`[4. TAGS] Usuário para criação de tags: ${createdBy}`);
    
    // Verificar se o usuário existe
    let userExists = false;
    if (createdBy !== '00000000-0000-0000-0000-000000000000') {
      const { data: userCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', createdBy)
        .maybeSingle();
      
      userExists = !!userCheck;
      console.log(`[4. TAGS] Verificação do usuário ${createdBy}: ${userExists ? 'Encontrado' : 'Não encontrado'}`);
    } else {
      console.log(`[4. TAGS] Usando usuário do sistema (00000000-0000-0000-0000-000000000000)`);
    }
    
    // Se não encontrar o usuário criador, buscar um usuário qualquer para criar as tags
    let tagCreationUser = createdBy;
    if (!userExists) {
      const { data: firstUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (firstUser) {
        tagCreationUser = firstUser.id;
        console.log(`[4. TAGS] Usando primeiro usuário disponível para criação de tags: ${tagCreationUser}`);
      } else {
        console.log(`[4. TAGS] Nenhum usuário encontrado para criação de tags. Usando ID do sistema.`);
      }
    }
    
    // Adicionar novas tags
    let tagsAddedSuccess = 0;
    let tagsAddedFail = 0;
    const tagErrors = [];
    
    for (const tag of tagsToAdd) {
      if (!tag) {
        console.log(`[4. TAGS] Tag vazia encontrada, ignorando`);
        continue;
      }
      
      // Verificar se a tag já existe no sistema
      console.log(`[4. TAGS] Processando tag: "${tag}"`);
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id, name')
        .eq('name', tag)
        .maybeSingle();
      
      // Se a tag não existir, criar
      if (!existingTag) {
        console.log(`[4. TAGS] Tag "${tag}" não encontrada no sistema. Criando...`);
        
        try {
          const { error: tagInsertError } = await supabase
            .from('tags')
            .insert({ 
              name: tag,
              created_by: tagCreationUser
            });
            
          if (tagInsertError) {
            console.error(`[4. TAGS] Erro ao criar tag "${tag}": ${tagInsertError.message} (código: ${tagInsertError.code})`);
            tagErrors.push({ tag, error: tagInsertError.message });
            tagsAddedFail++;
          } else {
            console.log(`[4. TAGS] Tag "${tag}" criada com sucesso`);
            tagsAddedSuccess++;
          }
        } catch (error) {
          console.error(`[4. TAGS] Exceção ao criar tag "${tag}": ${error.message}`);
          tagErrors.push({ tag, error: error.message });
          tagsAddedFail++;
        }
      } else {
        console.log(`[4. TAGS] Tag "${tag}" já existe no sistema com ID ${existingTag.id}`);
      }
      
      // Associar a tag ao contato
      try {
        console.log(`[4. TAGS] Associando tag "${tag}" ao contato ${contactId}`);
        
        const { error: tagContactError } = await supabase
          .from('contact_tags')
          .insert({
            contact_id: contactId.toString(),
            tag_name: tag
          });
        
        if (tagContactError) {
          if (tagContactError.code === '23505') { // Unique violation
            console.log(`[4. TAGS] Tag "${tag}" já associada ao contato ${contactId}`);
          } else {
            console.error(`[4. TAGS] Erro ao associar tag "${tag}" ao contato: ${tagContactError.message} (código: ${tagContactError.code})`);
            tagErrors.push({ tag, error: tagContactError.message });
          }
        } else {
          console.log(`[4. TAGS] Tag "${tag}" associada com sucesso ao contato ${contactId}`);
        }
      } catch (error) {
        console.error(`[4. TAGS] Exceção ao associar tag "${tag}" ao contato: ${error.message}`);
        tagErrors.push({ tag, error: error.message });
      }
    }
    
    // Remover tags que não estão mais presentes
    if (tagsToRemove.length > 0) {
      console.log(`[4. TAGS] Removendo ${tagsToRemove.length} tag(s) do contato ${contactId}: ${JSON.stringify(tagsToRemove)}`);
      
      const { error: removeError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId.toString())
        .in('tag_name', tagsToRemove);
      
      if (removeError) {
        console.error(`[4. TAGS] Erro ao remover tags do contato: ${removeError.message}`);
      } else {
        console.log(`[4. TAGS] ${tagsToRemove.length} tag(s) removidas com sucesso do contato ${contactId}`);
      }
    }

    // [5. VERIFICAÇÃO DE SEQUÊNCIAS] - Verificar e processar sequências
    console.log(`[5. SEQUÊNCIAS] Verificando sequências elegíveis para o contato ${contactId}`);
    
    // Buscar todas as instâncias ativas do cliente
    console.log(`[5. SEQUÊNCIAS] Buscando instâncias ativas para cliente ${existingClient.id} (${existingClient.account_name})`);
    const { data: activeInstances, error: instanceError } = await supabase
      .from('instances')
      .select('id, name')
      .eq('client_id', existingClient.id)
      .eq('active', true);
      
    if (instanceError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao buscar instâncias: ${instanceError.message}`, instanceError);
      throw instanceError;
    }
    
    console.log(`[5. SEQUÊNCIAS] Encontradas ${activeInstances?.length || 0} instâncias ativas para cliente ${existingClient.id}`);
    
    // Debug adicional para verificar se há instâncias
    const { data: allInstances } = await supabase
      .from('instances')
      .select('id, name, client_id, active');
      
    console.log(`[5. SEQUÊNCIAS] DEBUG: Total de instâncias no banco: ${allInstances?.length || 0}`);
    if (allInstances && allInstances.length > 0) {
      console.log(`[5. SEQUÊNCIAS] DEBUG: Primeiras 3 instâncias:`);
      allInstances.slice(0, 3).forEach((inst, i) => {
        console.log(`  [${i+1}] ID=${inst.id}, Nome=${inst.name}, Cliente=${inst.client_id}, Ativa=${inst.active}`);
      });
      
      console.log(`[5. SEQUÊNCIAS] DEBUG: Filtro aplicado: { client_id: ${existingClient.id}, active: true }`);
    }
      
    if (!activeInstances || activeInstances.length === 0) {
      console.log(`[5. SEQUÊNCIAS] ALERTA: Nenhuma instância ativa encontrada para o cliente ${existingClient.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contato processado com sucesso, mas nenhuma instância ativa encontrada.',
          debug: {
            clientId: existingClient.id,
            accountId: accountId,
            accountName: accountName,
            contactId: contactId,
            totalInstancesInDb: allInstances?.length || 0,
            activeFilter: { client_id: existingClient.id, active: true }
          },
          details: {
            contactId,
            tagsAdded: tagsToAdd.length,
            tagsRemoved: tagsToRemove.length,
            tagsAddedSuccess,
            tagsAddedFail,
            tagErrors
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Para cada instância, verificar sequências elegíveis
    let totalEligibleSequences = 0;
    let totalAddedSequences = 0;
    let totalRemovedSequences = 0;
    
    for (const instance of activeInstances) {
      console.log(`[5. SEQUÊNCIAS] Processando instância ${instance.id} (${instance.name})`);
      
      // Buscar sequências ativas da instância
      const { data: activeSequences, error: sequencesError } = await supabase
        .from('sequences')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('status', 'active');
        
      if (sequencesError) {
        console.error(`[5. SEQUÊNCIAS] Erro ao buscar sequências para instância ${instance.name}: ${sequencesError.message}`);
        continue;
      }
      
      console.log(`[5. SEQUÊNCIAS] Encontradas ${activeSequences?.length || 0} sequências ativas para instância ${instance.name}`);
      
      if (!activeSequences || activeSequences.length === 0) {
        console.log(`[5. SEQUÊNCIAS] Nenhuma sequência ativa para instância ${instance.name}, pulando`);
        continue;
      }
      
      // Para cada sequência, verificar elegibilidade com base nas tags
      for (const sequence of activeSequences) {
        console.log(`[5. SEQUÊNCIAS] Verificando elegibilidade para sequência ${sequence.id} (${sequence.name})`);
        
        // Verificação de condição de início
        const { start_condition_type, start_condition_tags } = sequence;
        console.log(`[5. SEQUÊNCIAS] Condição de início: ${start_condition_type}, tags: ${JSON.stringify(start_condition_tags)}`);
        
        let isEligible = false;
        
        // Verificar condição de início
        if (start_condition_type === 'AND') {
          // Todos os tags devem estar presentes
          isEligible = start_condition_tags.every(tag => tags.includes(tag));
          console.log(`[5. SEQUÊNCIAS] Verificação AND - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
        } else {
          // Qualquer uma das tags deve estar presente
          isEligible = start_condition_tags.some(tag => tags.includes(tag));
          console.log(`[5. SEQUÊNCIAS] Verificação OR - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
        }
        
        if (isEligible) {
          totalEligibleSequences++;
          console.log(`[5. SEQUÊNCIAS] Contato ${contactId} é elegível para sequência ${sequence.name}`);
          
          // Verificar se o contato já está na sequência
          console.log(`[5. SEQUÊNCIAS] Verificando se contato já está na sequência ${sequence.name}`);
          const { data: existingContactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id, status')
            .eq('contact_id', contactId.toString())
            .eq('sequence_id', sequence.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (contactSeqError) {
            console.error(`[5. SEQUÊNCIAS] Erro ao verificar se contato já está na sequência: ${contactSeqError.message}`);
            continue;
          }
          
          // Se o contato já está ativo nesta sequência, pular
          if (existingContactSequence && existingContactSequence.status === 'active') {
            console.log(`[5. SEQUÊNCIAS] Contato ${contactId} já está ativo na sequência ${sequence.name}, pulando`);
            continue;
          }
          
          // Verificar condição de parada
          const { stop_condition_type, stop_condition_tags } = sequence;
          console.log(`[5. SEQUÊNCIAS] Condição de parada: ${stop_condition_type}, tags: ${JSON.stringify(stop_condition_tags)}`);
          
          if (stop_condition_tags && stop_condition_tags.length > 0) {
            let shouldStop = false;
            
            if (stop_condition_type === 'AND') {
              // Todos os tags de parada devem estar presentes
              shouldStop = stop_condition_tags.every(tag => tags.includes(tag));
              console.log(`[5. SEQUÊNCIAS] Verificação de parada AND - ${shouldStop ? 'DEVE PARAR' : 'NÃO DEVE PARAR'}`);
            } else {
              // Qualquer uma das tags de parada deve estar presente
              shouldStop = stop_condition_tags.some(tag => tags.includes(tag));
              console.log(`[5. SEQUÊNCIAS] Verificação de parada OR - ${shouldStop ? 'DEVE PARAR' : 'NÃO DEVE PARAR'}`);
            }
            
            if (shouldStop) {
              console.log(`[5. SEQUÊNCIAS] Contato ${contactId} atende condição de parada para sequência ${sequence.name}`);
              
              // Se o contato estiver em uma sequência inativa ou concluída, não temos que fazer nada
              if (existingContactSequence && existingContactSequence.status !== 'active') {
                console.log(`[5. SEQUÊNCIAS] Contato já está em estado não-ativo (${existingContactSequence.status}) na sequência, pulando`);
                continue;
              }
              
              // Se o contato estiver ativo na sequência, remover
              if (existingContactSequence) {
                console.log(`[5. SEQUÊNCIAS] Removendo contato ${contactId} da sequência ${sequence.name}`);
                const { error: removeError } = await supabase
                  .from('contact_sequences')
                  .update({
                    status: 'removed',
                    removed_at: new Date().toISOString()
                  })
                  .eq('id', existingContactSequence.id);
                  
                if (removeError) {
                  console.error(`[5. SEQUÊNCIAS] Erro ao remover contato da sequência: ${removeError.message}`);
                } else {
                  console.log(`[5. SEQUÊNCIAS] Contato ${contactId} removido com sucesso da sequência ${sequence.name}`);
                  totalRemovedSequences++;
                }
              }
              
              continue;
            }
          }
          
          // Se o contato já concluiu ou foi removido da sequência, não adicionar novamente
          if (existingContactSequence && 
              (existingContactSequence.status === 'completed' || existingContactSequence.status === 'removed')) {
            console.log(`[5. SEQUÊNCIAS] Contato ${contactId} já esteve na sequência ${sequence.name} (status: ${existingContactSequence.status}), não adicionar novamente`);
            continue;
          }
          
          // Adicionar contato à sequência
          console.log(`[5. SEQUÊNCIAS] Adicionando contato ${contactId} à sequência ${sequence.name}`);
          try {
            // Buscar o primeiro estágio da sequência
            const { data: firstStage, error: stageError } = await supabase
              .from('sequence_stages')
              .select('*')
              .eq('sequence_id', sequence.id)
              .order('order_index', { ascending: true })
              .limit(1)
              .maybeSingle();
              
            if (stageError) {
              console.error(`[5. SEQUÊNCIAS] Erro ao buscar primeiro estágio da sequência: ${stageError.message}`);
              continue;
            }
            
            if (!firstStage) {
              console.error(`[5. SEQUÊNCIAS] Nenhum estágio encontrado para a sequência ${sequence.name}`);
              continue;
            }
            
            console.log(`[5. SEQUÊNCIAS] Primeiro estágio encontrado: ${firstStage.id} (${firstStage.name})`);
            
            // Criar registro na tabela contact_sequences
            const { data: contactSequence, error: createSeqError } = await supabase
              .from('contact_sequences')
              .insert({
                contact_id: contactId.toString(),
                sequence_id: sequence.id,
                current_stage_index: 0,
                current_stage_id: firstStage.id,
                status: 'active'
              })
              .select('id')
              .single();
              
            if (createSeqError) {
              console.error(`[5. SEQUÊNCIAS] Erro ao adicionar contato à sequência: ${createSeqError.message} (código: ${createSeqError.code})`);
              continue;
            }
            
            console.log(`[5. SEQUÊNCIAS] Contato ${contactId} adicionado à sequência ${sequence.name} com ID ${contactSequence.id}`);
            totalAddedSequences++;
            
            // Criar registro de progresso para o primeiro estágio
            const { error: progressError } = await supabase
              .from('stage_progress')
              .insert({
                contact_sequence_id: contactSequence.id,
                stage_id: firstStage.id,
                status: 'pending'
              });
              
            if (progressError) {
              console.error(`[5. SEQUÊNCIAS] Erro ao criar registro de progresso: ${progressError.message}`);
            } else {
              console.log(`[5. SEQUÊNCIAS] Registro de progresso criado com sucesso para estágio ${firstStage.name}`);
            }
            
            // Calcular o tempo para o primeiro envio
            console.log(`[5. SEQUÊNCIAS] Calculando tempo para primeiro envio do estágio ${firstStage.name}`);
            const now = new Date();
            let scheduledTime = new Date(now);
            
            // Adicionar o delay do estágio
            console.log(`[5. SEQUÊNCIAS] Aplicando delay: ${firstStage.delay} ${firstStage.delay_unit}`);
            switch (firstStage.delay_unit) {
              case 'minutes':
                scheduledTime.setMinutes(scheduledTime.getMinutes() + firstStage.delay);
                break;
              case 'hours':
                scheduledTime.setHours(scheduledTime.getHours() + firstStage.delay);
                break;
              case 'days':
                scheduledTime.setDate(scheduledTime.getDate() + firstStage.delay);
                break;
              default:
                scheduledTime.setMinutes(scheduledTime.getMinutes() + firstStage.delay);
            }
            
            const rawScheduledTime = new Date(scheduledTime);
            console.log(`[5. SEQUÊNCIAS] Tempo inicial calculado: ${scheduledTime.toISOString()}`);
            
            // Verificar restrições de horário
            // Aqui deveríamos ajustar o scheduledTime com base nas restrições
            // Por simplicidade, vamos pular esta etapa no exemplo
            
            // Criar mensagem agendada
            console.log(`[5. SEQUÊNCIAS] Agendando mensagem para ${scheduledTime.toISOString()}`);
            const { data: scheduledMessage, error: scheduleError } = await supabase
              .from('scheduled_messages')
              .insert({
                contact_id: contactId.toString(),
                sequence_id: sequence.id,
                stage_id: firstStage.id,
                raw_scheduled_time: rawScheduledTime.toISOString(),
                scheduled_time: scheduledTime.toISOString(),
                status: 'pending'
              })
              .select('id')
              .single();
              
            if (scheduleError) {
              console.error(`[5. SEQUÊNCIAS] Erro ao agendar mensagem: ${scheduleError.message}`);
            } else {
              console.log(`[5. SEQUÊNCIAS] Mensagem agendada com sucesso para ${scheduledTime.toISOString()}, ID: ${scheduledMessage.id}`);
              
              // Incrementar contadores de estatísticas
              const today = new Date().toISOString().split('T')[0];
              
              const { error: statsError } = await supabase.rpc('increment_daily_stats', {
                instance_id: instance.id,
                stat_date: today,
                completed_seqs: 0,
                msgs_sent: 0,
                msgs_failed: 0,
                msgs_scheduled: 1,
                new_contacts: 0
              });
              
              if (statsError) {
                console.error(`[5. SEQUÊNCIAS] Erro ao atualizar estatísticas: ${statsError.message}`);
              } else {
                console.log(`[5. SEQUÊNCIAS] Estatísticas atualizadas com sucesso`);
              }
            }
          } catch (error) {
            console.error(`[5. SEQUÊNCIAS] Erro crítico ao processar adição à sequência: ${error.message}`);
            console.error(error.stack);
          }
        } else {
          console.log(`[5. SEQUÊNCIAS] Contato ${contactId} NÃO é elegível para sequência ${sequence.name}`);
          
          // Se o contato está na sequência mas não atende mais os critérios, verificar se deve ser removido
          const { data: existingContactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id, status')
            .eq('contact_id', contactId.toString())
            .eq('sequence_id', sequence.id)
            .eq('status', 'active')
            .maybeSingle();
            
          if (contactSeqError) {
            console.error(`[5. SEQUÊNCIAS] Erro ao verificar se contato está na sequência: ${contactSeqError.message}`);
            continue;
          }
          
          if (existingContactSequence) {
            console.log(`[5. SEQUÊNCIAS] Contato ${contactId} está na sequência ${sequence.name} mas não atende mais os critérios iniciais. Mantendo.`);
            // Por padrão, estamos deixando ele continuar na sequência mesmo que não atenda mais os critérios iniciais
          }
        }
      }
    }

    // [6. RESPOSTA] - Responder com sucesso e estatísticas
    console.log(`[6. RESPOSTA] Processamento concluído. Contato: ${contactId}, Cliente: ${existingClient.id} (${existingClient.account_name})`);
    console.log(`[6. RESPOSTA] Tags adicionadas: ${tagsAddedSuccess} sucesso, ${tagsAddedFail} falhas`);
    console.log(`[6. RESPOSTA] Sequências: ${totalEligibleSequences} elegíveis, ${totalAddedSequences} adicionadas, ${totalRemovedSequences} removidas`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contato e tags processados com sucesso',
        details: {
          contactId,
          clientId: existingClient.id,
          clientName: existingClient.account_name,
          accountId: accountId,
          tagsAdded: tagsToAdd.length,
          tagsRemoved: tagsToRemove.length,
          tagsAddedSuccess,
          tagsAddedFail,
          tagErrors,
          eligibleSequences: totalEligibleSequences,
          addedToSequences: totalAddedSequences,
          removedFromSequences: totalRemovedSequences
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[CRITICAL] Erro não tratado: ${error.message}`);
    console.error(error.stack);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
