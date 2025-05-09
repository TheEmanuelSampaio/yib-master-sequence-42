
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

console.log('[INIT] SUPABASE_URL definido:', supabaseUrl ? 'SIM' : 'NÃO');
console.log('[INIT] SUPABASE_ANON_KEY definido:', supabaseAnonKey ? 'SIM' : 'NÃO');

Deno.serve(async (req) => {
  console.log('[REQUEST] Método:', req.method, ', URL:', req.url);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Criar cliente Supabase
    console.log('[CLIENT] Criando cliente Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[CLIENT] Cliente Supabase criado com sucesso');
    
    // Parse do corpo da requisição
    console.log('[PARSE] Iniciando parse do corpo da requisição...');
    const body = await req.text();
    console.log('[PARSE] Body recebido:', body);
    
    let requestData;
    try {
      requestData = JSON.parse(body);
      console.log('[PARSE] JSON parseado com sucesso:', requestData);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar JSON', 
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messageId, status } = requestData;
    
    if (!messageId) {
      return new Response(
        JSON.stringify({ 
          error: 'messageId não fornecido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Buscar a mensagem no banco de dados
    const { data: message, error: messageError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (messageError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar mensagem', 
          details: messageError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[MESSAGE] Mensagem encontrada:', JSON.stringify(message));
    
    // Atualizar status da mensagem
    const newStatus = status === 'success' ? 'sent' : 'failed';
    
    console.log(`[UPDATE] Atualizando status da mensagem ${messageId} para ${newStatus} com ${message.attempts + 1} tentativas`);
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update({
        status: newStatus,
        attempts: message.attempts + 1,
        sent_at: status === 'success' ? new Date().toISOString() : null
      })
      .eq('id', messageId);
    
    if (updateError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao atualizar mensagem', 
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Se mensagem for entregue com sucesso, avançar o contato na sequência
    if (status === 'success') {
      console.log('[SEQUENCE] Processando avanço do contato na sequência');
      
      // Buscar a sequência atual do contato
      const { data: contactSequence, error: seqError } = await supabase
        .from('contact_sequences')
        .select('id, current_stage_index, current_stage_id')
        .eq('contact_id', message.contact_id)
        .eq('sequence_id', message.sequence_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (seqError) {
        console.error('[SEQUENCE] Erro ao buscar sequência:', JSON.stringify(seqError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada com sucesso, mas erro ao avançar sequência',
            status: newStatus,
            error: seqError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!contactSequence) {
        console.log('[SEQUENCE] Sequência não encontrada ou não está ativa');
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada com sucesso, sequência não encontrada ou não está ativa',
            status: newStatus
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[SEQUENCE] Sequência encontrada:', JSON.stringify(contactSequence));
      
      // Marcar o estágio atual como concluído
      const { error: progressError } = await supabase
        .from('stage_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('contact_sequence_id', contactSequence.id)
        .eq('stage_id', message.stage_id);
      
      if (progressError) {
        console.error('[PROGRESS] Erro ao atualizar progresso:', JSON.stringify(progressError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada com sucesso, mas erro ao atualizar progresso',
            status: newStatus,
            error: progressError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[PROGRESS] Estágio', message.stage_id, 'marcado como concluído');
      
      // Buscar o próximo estágio da sequência
      const nextStageIndex = contactSequence.current_stage_index + 1;
      console.log('[SEQUENCE] Índice atual:', contactSequence.current_stage_index, 'próximo índice:', nextStageIndex);
      
      const { data: nextStage, error: nextStageError } = await supabase
        .from('sequence_stages')
        .select('id, name, delay, delay_unit, type, content')
        .eq('sequence_id', message.sequence_id)
        .eq('order_index', nextStageIndex)
        .maybeSingle();
      
      if (nextStageError) {
        console.error('[SEQUENCE] Erro ao buscar próximo estágio:', JSON.stringify(nextStageError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada com sucesso, mas erro ao buscar próximo estágio',
            status: newStatus,
            error: nextStageError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!nextStage) {
        // Não há mais estágios, marcar sequência como concluída
        console.log('[SEQUENCE] Nenhum próximo estágio encontrado. Marcando sequência como concluída.');
        
        const { error: completeError } = await supabase
          .from('contact_sequences')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', contactSequence.id);
        
        if (completeError) {
          console.error('[SEQUENCE] Erro ao marcar sequência como concluída:', JSON.stringify(completeError));
          return new Response(
            JSON.stringify({ 
              message: 'Mensagem atualizada com sucesso, mas erro ao marcar sequência como concluída',
              status: newStatus,
              error: completeError.message
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[SEQUENCE] Sequência marcada como concluída com sucesso');
        
        // Incrementar estatísticas de sequências concluídas
        try {
          // Obter ID da instância
          const { data: sequenceData } = await supabase
            .from('sequences')
            .select('instance_id')
            .eq('id', message.sequence_id)
            .single();
          
          if (sequenceData) {
            const today = new Date().toISOString().split('T')[0];
            
            // Verificar se já existe estatística para hoje
            const { data: existingStats } = await supabase
              .from('daily_stats')
              .select('*')
              .eq('instance_id', sequenceData.instance_id)
              .eq('date', today)
              .maybeSingle();
            
            if (existingStats) {
              await supabase
                .from('daily_stats')
                .update({
                  completed_sequences: existingStats.completed_sequences + 1
                })
                .eq('id', existingStats.id);
            } else {
              await supabase
                .from('daily_stats')
                .insert({
                  instance_id: sequenceData.instance_id,
                  date: today,
                  messages_scheduled: 0,
                  messages_sent: 0,
                  messages_failed: 0,
                  completed_sequences: 1,
                  new_contacts: 0
                });
            }
          }
        } catch (statsError) {
          console.error('[STATISTICS] Erro ao atualizar estatísticas:', JSON.stringify(statsError));
        }
        
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada e sequência concluída com sucesso',
            status: newStatus
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[SEQUENCE] Próximo estágio encontrado: ${nextStage.name} (${nextStage.id})`);
      
      // Avançar para o próximo estágio
      const { error: advanceError } = await supabase
        .from('contact_sequences')
        .update({
          current_stage_id: nextStage.id,
          current_stage_index: nextStageIndex,
          last_message_at: new Date().toISOString()
        })
        .eq('id', contactSequence.id);
      
      if (advanceError) {
        console.error('[SEQUENCE] Erro ao avançar estágio:', JSON.stringify(advanceError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada com sucesso, mas erro ao avançar estágio',
            status: newStatus,
            error: advanceError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[SEQUENCE] Contato avançado para o estágio ${nextStageIndex} (${nextStage.name})`);
      
      // Criar registro de progresso para o novo estágio
      const { error: newProgressError } = await supabase
        .from('stage_progress')
        .insert({
          contact_sequence_id: contactSequence.id,
          stage_id: nextStage.id,
          status: 'pending'
        });
      
      if (newProgressError) {
        console.error('[PROGRESS] Erro ao criar progresso para novo estágio:', JSON.stringify(newProgressError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada e estágio avançado, mas erro ao criar progresso',
            status: newStatus,
            error: newProgressError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[PROGRESS] Progresso para estágio ${nextStage.name} criado como pendente`);
      
      // Obter as variáveis da mensagem atual para passar para a próxima mensagem
      console.log('[VARIÁVEIS] Obtendo variáveis da mensagem atual:', message.variables);
      const messageVariables = message.variables || {};
      
      // Calcular atraso para a próxima mensagem
      const delayMs = calculateDelayMs(nextStage.delay, nextStage.delay_unit);
      const scheduledTime = new Date(Date.now() + delayMs);
      
      // Processar o conteúdo com as variáveis
      let processedContent = null;
      
      // Processar o conteúdo de acordo com o tipo da mensagem
      if (nextStage.type === 'message' || nextStage.type === 'pattern') {
        console.log('[VARIÁVEIS] Processando variáveis para conteúdo do tipo', nextStage.type);
        try {
          processedContent = processMessageContent(nextStage.content, messageVariables);
          console.log('[VARIÁVEIS] Conteúdo processado com sucesso:', processedContent);
        } catch (varError) {
          console.error('[VARIÁVEIS] Erro ao processar variáveis:', varError);
          processedContent = nextStage.content;
        }
      } 
      // Para o tipo typebot, apenas passamos as variáveis, o conteúdo será processado pelo typebot
      else if (nextStage.type === 'typebot') {
        console.log('[VARIÁVEIS] Mensagem do tipo typebot, as variáveis serão passadas para o typebot');
      }
      
      // Agendar a próxima mensagem
      const { error: scheduleError } = await supabase
        .from('scheduled_messages')
        .insert({
          contact_id: message.contact_id,
          sequence_id: message.sequence_id,
          stage_id: nextStage.id,
          raw_scheduled_time: scheduledTime.toISOString(),
          scheduled_time: scheduledTime.toISOString(),
          status: 'pending',
          variables: messageVariables,
          processed_content: processedContent
        });
      
      if (scheduleError) {
        console.error('[SCHEDULE] Erro ao agendar próxima mensagem:', JSON.stringify(scheduleError));
        return new Response(
          JSON.stringify({ 
            message: 'Mensagem atualizada e estágio avançado, mas erro ao agendar próxima mensagem',
            status: newStatus,
            error: scheduleError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[SCHEDULE] Nova mensagem agendada com sucesso para ${scheduledTime.toISOString()}`);
      console.log(`[VARIÁVEIS] Variáveis passadas para a próxima mensagem:`, JSON.stringify(messageVariables));
      if (processedContent) {
        console.log(`[VARIÁVEIS] Conteúdo processado para a próxima mensagem:`, processedContent);
      }
      
      // Incrementar estatísticas
      try {
        // Obter ID da instância
        const { data: sequenceData } = await supabase
          .from('sequences')
          .select('instance_id')
          .eq('id', message.sequence_id)
          .single();
        
        if (sequenceData) {
          const today = new Date().toISOString().split('T')[0];
          
          // Verificar se já existe estatística para hoje
          const { data: existingStats } = await supabase
            .from('daily_stats')
            .select('*')
            .eq('instance_id', sequenceData.instance_id)
            .eq('date', today)
            .maybeSingle();
          
          if (existingStats) {
            await supabase
              .from('daily_stats')
              .update({
                messages_sent: existingStats.messages_sent + 1,
                messages_scheduled: existingStats.messages_scheduled + 1
              })
              .eq('id', existingStats.id);
          } else {
            await supabase
              .from('daily_stats')
              .insert({
                instance_id: sequenceData.instance_id,
                date: today,
                messages_scheduled: 1,
                messages_sent: 1,
                messages_failed: 0,
                completed_sequences: 0,
                new_contacts: 0
              });
          }
        }
      } catch (statsError) {
        console.error('[STATISTICS] Erro ao atualizar estatísticas:', JSON.stringify(statsError));
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'Mensagem atualizada, estágio avançado e próxima mensagem agendada com sucesso',
          status: newStatus,
          nextStage: nextStage.name,
          scheduledTime: scheduledTime.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else if (status === 'error') {
      // Se mensagem falhar, verificar número de tentativas
      if (message.attempts + 1 >= 3) {
        // Marcar como erro persistente após 3 tentativas
        const { error: persistentError } = await supabase
          .from('scheduled_messages')
          .update({
            status: 'persistent_error'
          })
          .eq('id', messageId);
        
        if (persistentError) {
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao marcar como erro persistente', 
              details: persistentError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Status da mensagem atualizado com sucesso',
        status: newStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[ERROR]', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para calcular atraso em milissegundos
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

// Função auxiliar para processar conteúdo da mensagem com variáveis
function processMessageContent(content: string, variables: Record<string, any>): string {
  console.log('[VARIÁVEIS] Variáveis disponíveis:', variables);
  
  // Se não tiver variáveis ou não for uma string, retornar conteúdo original
  if (!variables || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;
  
  // Substituir todas as variáveis no formato {nome_variavel}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    if (processedContent.includes(placeholder)) {
      console.log(`[VARIÁVEIS] Substituindo ${key} por ${value}`);
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }

  console.log('[VARIÁVEIS] Conteúdo após substituição:', processedContent);
  return processedContent;
}

