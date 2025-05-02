
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Logs de inicialização
console.log(`[INIT] Inicializando função delivery-status`);
console.log(`[INIT] SUPABASE_URL definido: ${supabaseUrl ? 'SIM' : 'NÃO'}`);
console.log(`[INIT] SUPABASE_ANON_KEY definido: ${supabaseAnonKey ? 'SIM' : 'NÃO'}`);

Deno.serve(async (req) => {
  console.log(`[REQUEST] Método: ${req.method}, URL: ${req.url}`);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Requisição OPTIONS recebida, retornando cabeçalhos CORS`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[CLIENT] Criando cliente Supabase...`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log(`[CLIENT] Cliente Supabase criado com sucesso`);
    
    // Parse the request body
    console.log(`[PARSE] Iniciando parse do corpo da requisição...`);
    const body = await req.text();
    console.log(`[PARSE] Body recebido: ${body}`);
    
    // Tentando converter body para JSON
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log(`[PARSE] JSON parseado com sucesso:`, jsonData);
    } catch (parseError) {
      console.error(`[PARSE] Erro ao parsear JSON: ${parseError.message}`);
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar formato correto do payload
    const { messageId, status } = jsonData;
    
    if (!messageId || !status) {
      console.error(`[VALIDATE] Dados obrigatórios ausentes:`, JSON.stringify({
        temMessageId: !!messageId,
        temStatus: !!status
      }));
      
      return new Response(
        JSON.stringify({ 
          error: 'Dados obrigatórios ausentes',
          esperado: {
            messageId: 'uuid da mensagem',
            status: 'success ou failed'
          },
          recebido: jsonData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    
    // Primeiro, obter os dados atuais da mensagem para saber tentativas e status atual
    const { data: messageData, error: getMessageError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (getMessageError) {
      console.error(`[MESSAGE] Erro ao buscar mensagem: ${getMessageError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar mensagem', 
          details: getMessageError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!messageData) {
      return new Response(
        JSON.stringify({ error: 'Mensagem não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[MESSAGE] Mensagem encontrada: ${JSON.stringify(messageData)}`);
    
    // Incrementar tentativas independentemente do status
    const attempts = (messageData.attempts || 0) + 1;
    
    // Determinar qual status definir com base na resposta
    let newStatus = 'pending'; // Valor padrão
    let updateData = {};
    
    if (status === 'success') {
      newStatus = 'sent';
      updateData = {
        status: newStatus,
        sent_at: now,
        attempts: attempts
      };
    } else {
      // Se falhou e já tentou 3 vezes, marcar como erro persistente
      if (attempts >= 3) {
        newStatus = 'persistent_error';
      } else {
        newStatus = 'failed';
      }
      
      updateData = {
        status: newStatus,
        attempts: attempts
      };
    }
    
    console.log(`[UPDATE] Atualizando status da mensagem ${messageId} para ${newStatus} com ${attempts} tentativas`);
    
    // Atualizar status da mensagem
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update(updateData)
      .eq('id', messageId);
    
    if (updateError) {
      console.error(`[UPDATE] Erro ao atualizar status: ${updateError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao atualizar status da mensagem', 
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let nextStageInfo = null;
    
    // Se foi um sucesso, podemos avançar o contato na sequência
    if (status === 'success') {
      console.log(`[SEQUENCE] Processando avanço do contato na sequência`);
      const { contact_id, sequence_id, stage_id } = messageData;
      
      // Buscar a sequência ativa do contato
      const { data: contactSequence, error: sequenceError } = await supabase
        .from('contact_sequences')
        .select('id, current_stage_index, current_stage_id')
        .eq('contact_id', contact_id)
        .eq('sequence_id', sequence_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (sequenceError) {
        console.error(`[SEQUENCE] Erro ao buscar sequência do contato: ${sequenceError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar sequência do contato', 
            details: sequenceError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!contactSequence) {
        console.log(`[SEQUENCE] Nenhuma sequência ativa encontrada para este contato e sequência`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Status da mensagem atualizado para ${newStatus}, mas nenhuma sequência ativa encontrada.`,
            messageId,
            status: newStatus,
            attempts,
            processedAt: now
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[SEQUENCE] Sequência encontrada: ${JSON.stringify(contactSequence)}`);
      
      // Verificar se o estágio atual corresponde ao da mensagem
      if (contactSequence.current_stage_id !== stage_id) {
        console.warn(`[SEQUENCE] O estágio atual do contato (${contactSequence.current_stage_id}) não corresponde ao da mensagem (${stage_id}).`);
      }
      
      // Marcar o estágio atual como concluído
      const { error: progressError } = await supabase
        .from('stage_progress')
        .upsert({
          contact_sequence_id: contactSequence.id,
          stage_id: stage_id,
          status: 'completed',
          completed_at: now
        }, { onConflict: 'contact_sequence_id,stage_id' });
          
      if (progressError) {
        console.error(`[PROGRESS] Erro ao atualizar progresso do estágio: ${progressError.message}`);
        // Não retornar erro, apenas logar e continuar
      } else {
        console.log(`[PROGRESS] Estágio ${stage_id} marcado como concluído`);
      }
        
      // Buscar todos os estágios da sequência para verificar qual é o próximo
      const { data: stages, error: stagesError } = await supabase
        .from('sequence_stages')
        .select('id, order_index, name, delay, delay_unit, type, content')
        .eq('sequence_id', sequence_id)
        .order('order_index', { ascending: true });
          
      if (stagesError) {
        console.error(`[STAGES] Erro ao buscar estágios da sequência: ${stagesError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar estágios da sequência', 
            details: stagesError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!stages || stages.length === 0) {
        console.error(`[STAGES] Nenhum estágio encontrado para a sequência ${sequence_id}`);
        return new Response(
          JSON.stringify({ 
            error: 'Nenhum estágio encontrado para esta sequência', 
            details: 'A sequência não tem estágios configurados.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Encontrar o índice do estágio atual
      const currentStageIndex = contactSequence.current_stage_index;
      const nextIndex = currentStageIndex + 1;
      console.log(`[SEQUENCE] Índice atual: ${currentStageIndex}, próximo índice: ${nextIndex}`);
      
      // Encontrar o próximo estágio com base no índice
      const nextStage = stages.find(s => s.order_index === nextIndex);
      
      // Obter a instância associada à sequência para atualizações de estatísticas
      const { data: sequenceData, error: seqDataError } = await supabase
        .from('sequences')
        .select('instance_id')
        .eq('id', sequence_id)
        .single();
        
      if (seqDataError) {
        console.error(`[SEQUENCE] Erro ao buscar dados da instância: ${seqDataError.message}`);
        // Não retornar erro, apenas logar e continuar
      }
      
      const instanceId = sequenceData?.instance_id;
      const today = now.split('T')[0];
      
      // Se há um próximo estágio, avançar para ele
      if (nextStage) {
        console.log(`[SEQUENCE] Próximo estágio encontrado: ${nextStage.name} (${nextStage.id})`);
        
        try {
          // Atualizar a sequência do contato para o próximo estágio
          const { error: updateSequenceError } = await supabase
            .from('contact_sequences')
            .update({
              current_stage_index: nextIndex,
              current_stage_id: nextStage.id,
              last_message_at: now
            })
            .eq('id', contactSequence.id);
            
          if (updateSequenceError) {
            console.error(`[SEQUENCE] Erro ao avançar contato na sequência: ${updateSequenceError.message}`);
            return new Response(
              JSON.stringify({ 
                error: 'Erro ao avançar contato na sequência', 
                details: updateSequenceError.message 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.log(`[SEQUENCE] Contato avançado para o estágio ${nextIndex} (${nextStage.name})`);
          
          // Adicionar o novo estágio como pendente no histórico de progresso
          const { error: newProgressError } = await supabase
            .from('stage_progress')
            .insert({
              contact_sequence_id: contactSequence.id,
              stage_id: nextStage.id,
              status: 'pending'
            });
              
          if (newProgressError) {
            console.error(`[PROGRESS] Erro ao criar registro de progresso: ${newProgressError.message}`);
            // Não retornar erro, apenas logar e continuar
          } else {
            console.log(`[PROGRESS] Progresso para estágio ${nextStage.name} criado como pendente`);
          }
          
          // Calcular o tempo de agendamento da nova mensagem
          const delayMs = calculateDelayMs(nextStage.delay, nextStage.delay_unit);
          const scheduledTime = new Date(Date.now() + delayMs);
          
          // Verificar se já existe uma mensagem agendada para este contato e estágio
          const { data: existingMessages, error: existingMsgError } = await supabase
            .from('scheduled_messages')
            .select('id')
            .eq('contact_id', contact_id)
            .eq('sequence_id', sequence_id)
            .eq('stage_id', nextStage.id)
            .in('status', ['pending', 'processing']);
            
          if (existingMsgError) {
            console.error(`[SCHEDULE] Erro ao verificar mensagens existentes: ${existingMsgError.message}`);
          } else if (existingMessages && existingMessages.length > 0) {
            console.log(`[SCHEDULE] Já existe uma mensagem agendada para este estágio. Não criando nova mensagem.`);
          } else {
            // Agendar a mensagem para o próximo estágio
            const { data: newMessage, error: scheduleError } = await supabase
              .from('scheduled_messages')
              .insert([{
                contact_id: contact_id,
                sequence_id: sequence_id,
                stage_id: nextStage.id,
                raw_scheduled_time: scheduledTime.toISOString(),
                scheduled_time: scheduledTime.toISOString(),
                status: 'pending',
                attempts: 0
              }])
              .select()
              .single();
            
            if (scheduleError) {
              console.error(`[SCHEDULE] Erro ao agendar mensagem: ${scheduleError.message}`);
              return new Response(
                JSON.stringify({ 
                  error: 'Erro ao agendar próxima mensagem', 
                  details: scheduleError.message 
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            console.log(`[SCHEDULE] Nova mensagem agendada com sucesso para ${scheduledTime.toISOString()}`);
            
            nextStageInfo = {
              id: nextStage.id,
              name: nextStage.name,
              messageId: newMessage.id,
              scheduledTime: scheduledTime.toISOString()
            };
            
            // Incrementar estatísticas para mensagens agendadas
            if (instanceId) {
              try {
                await updateDailyStats(supabase, instanceId, today, {
                  messages_scheduled: 1
                });
              } catch (statsError) {
                console.error(`[STATS] Erro ao incrementar estatísticas de agendamento: ${statsError}`);
              }
            }
          }
        } catch (sequenceError) {
          console.error(`[SEQUENCE] Erro ao processar avanço de estágio: ${sequenceError}`);
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao processar avanço de estágio', 
              details: sequenceError.message || 'Erro desconhecido' 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Se não há mais estágios, marcar a sequência como concluída
        console.log(`[SEQUENCE] Nenhum próximo estágio encontrado. Marcando sequência como concluída.`);
        
        try {
          const { error: completeSequenceError } = await supabase
            .from('contact_sequences')
            .update({
              status: 'completed',
              completed_at: now,
              last_message_at: now
            })
            .eq('id', contactSequence.id);
            
          if (completeSequenceError) {
            console.error(`[SEQUENCE] Erro ao marcar sequência como concluída: ${completeSequenceError.message}`);
            return new Response(
              JSON.stringify({ 
                error: 'Erro ao marcar sequência como concluída', 
                details: completeSequenceError.message 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.log(`[SEQUENCE] Sequência marcada como concluída com sucesso`);
          
          // Incrementar estatísticas para sequências concluídas
          if (instanceId) {
            try {
              await updateDailyStats(supabase, instanceId, today, {
                completed_sequences: 1
              });
            } catch (statsError) {
              console.error(`[STATS] Erro ao incrementar estatísticas de sequências concluídas: ${statsError}`);
            }
          }
        } catch (completeError) {
          console.error(`[SEQUENCE] Erro ao concluir sequência: ${completeError}`);
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao concluir sequência', 
              details: completeError.message || 'Erro desconhecido' 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Atualizar estatísticas diárias para mensagens enviadas/falhas
    if (status === 'success' || newStatus === 'persistent_error') {
      try {
        // Obter a instância relacionada à mensagem
        const { data: messageWithInstance } = await supabase
          .from('sequences')
          .select('instance_id')
          .eq('id', messageData.sequence_id)
          .single();
          
        if (messageWithInstance?.instance_id) {
          const statsData = status === 'success' 
            ? { messages_sent: 1 } 
            : { messages_failed: 1 };
          
          await updateDailyStats(supabase, messageWithInstance.instance_id, now.split('T')[0], statsData);
        }
      } catch (statsError) {
        console.error(`[STATS] Erro ao processar estatísticas: ${statsError}`);
      }
    }

    // Montar resposta com informações do próximo estágio se houver
    const response = {
      success: true, 
      message: `Status da mensagem atualizado para ${newStatus}`,
      messageId,
      status: newStatus,
      attempts,
      processedAt: now
    };
    
    // Adicionar informações do próximo estágio se houver
    if (nextStageInfo) {
      response.nextStage = nextStageInfo;
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[CRITICAL] Erro não tratado: ${error.message}`);
    console.error(`[CRITICAL] Stack: ${error.stack}`);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para calcular o atraso em milissegundos
function calculateDelayMs(delay: number, unit: string): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  switch (unit) {
    case 'minutes':
      return delay * minute;
    case 'hours':
      return delay * hour;
    case 'days':
      return delay * day;
    default:
      return delay * minute; // Fallback para minutos
  }
}

// Função auxiliar para atualizar estatísticas diárias
async function updateDailyStats(supabase, instanceId: string, date: string, stats: Record<string, number>) {
  // Primeiro verificar se já existe um registro para esta data e instância
  const { data: existingStats, error: queryError } = await supabase
    .from('daily_stats')
    .select('id')
    .eq('instance_id', instanceId)
    .eq('date', date)
    .single();
  
  if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`[STATS] Erro ao verificar estatísticas existentes: ${queryError.message}`);
    throw queryError;
  }
  
  if (existingStats) {
    // Se existe, fazer update incrementando os valores
    const updates = {};
    for (const [key, value] of Object.entries(stats)) {
      updates[key] = supabase.rpc('increment', { 
        x: value, 
        column_name: key,
        row_id: existingStats.id,
        table_name: 'daily_stats'
      });
    }
    
    // Executar os updates
    for (const [key, promise] of Object.entries(updates)) {
      try {
        await promise;
      } catch (updateError) {
        console.error(`[STATS] Erro ao atualizar estatística ${key}: ${updateError.message}`);
      }
    }
  } else {
    // Se não existe, criar um novo registro
    const newStats = {
      instance_id: instanceId,
      date: date,
      completed_sequences: stats.completed_sequences || 0,
      messages_sent: stats.messages_sent || 0,
      messages_failed: stats.messages_failed || 0,
      messages_scheduled: stats.messages_scheduled || 0,
      new_contacts: stats.new_contacts || 0
    };
    
    const { error: insertError } = await supabase
      .from('daily_stats')
      .insert([newStats]);
    
    if (insertError) {
      console.error(`[STATS] Erro ao inserir estatísticas: ${insertError.message}`);
      throw insertError;
    }
  }
}
