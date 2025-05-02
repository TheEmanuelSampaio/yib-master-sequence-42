
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Logs de inicialização
console.log(`[INIT] Inicializando função delivery-status`);

Deno.serve(async (req) => {
  console.log(`[REQUEST] Método: ${req.method}, URL: ${req.url}`);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Requisição OPTIONS recebida, retornando cabeçalhos CORS`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log(`[CLIENT] Cliente Supabase criado com sucesso`);
    
    // Parse the request body
    const body = await req.text();
    console.log(`[PARSE] Body recebido: ${body}`);
    
    // Parse JSON data
    let jsonData;
    try {
      jsonData = JSON.parse(body);
    } catch (parseError) {
      console.error(`[PARSE] Erro ao parsear JSON: ${parseError.message}`);
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados do payload
    const { messageId, status, attempts = 1 } = jsonData;
    
    if (!messageId || !status) {
      return new Response(
        JSON.stringify({ 
          error: 'Payload incompleto', 
          details: 'messageId e status são obrigatórios' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a mensagem existe
    const { data: message, error: messageError } = await supabase
      .from('scheduled_messages')
      .select(`
        id,
        contact_id,
        sequence_id,
        stage_id,
        attempts
      `)
      .eq('id', messageId)
      .single();

    if (messageError) {
      console.error(`[QUERY] Erro ao buscar mensagem: ${messageError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Mensagem não encontrada', 
          details: messageError.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar status da mensagem
    let newStatus = 'pending';
    let responseData: any = { messageId };
    
    if (status === 'success') {
      newStatus = 'sent';
      
      // Atualizar o status da mensagem para 'sent'
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({ 
          status: newStatus,
          sent_at: new Date().toISOString()
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error(`[UPDATE] Erro ao atualizar status da mensagem: ${updateError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao atualizar status da mensagem', 
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Atualizar estatísticas diárias
      try {
        // Obter a instância associada à sequência
        const { data: sequenceData, error: seqError } = await supabase
          .from('sequences')
          .select('instance_id')
          .eq('id', message.sequence_id)
          .single();
        
        if (!seqError && sequenceData) {
          // Atualizar estatísticas
          const statsData = {
            instance_id: sequenceData.instance_id,
            date: new Date().toISOString().split('T')[0],
            messages_sent: 1,
            messages_scheduled: 0,
            messages_failed: 0,
            completed_sequences: 0,
            new_contacts: 0
          };
          
          await supabase
            .from('daily_stats')
            .upsert(statsData);
        }
      } catch (statsError) {
        console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
      }
      
      // Buscar próximo estágio da sequência
      const { data: currentStage, error: stageError } = await supabase
        .from('sequence_stages')
        .select('*')
        .eq('id', message.stage_id)
        .single();
      
      if (stageError) {
        console.error(`[STAGE] Erro ao buscar estágio atual: ${stageError.message}`);
      } else {
        // Buscar próximo estágio
        const { data: nextStages, error: nextStageError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', message.sequence_id)
          .gt('order_index', currentStage.order_index)
          .order('order_index', { ascending: true })
          .limit(1);
        
        if (nextStageError) {
          console.error(`[STAGE] Erro ao buscar próximo estágio: ${nextStageError.message}`);
        } else if (nextStages && nextStages.length > 0) {
          // Existe próximo estágio
          const nextStage = nextStages[0];
          
          // Atualizar a sequência de contato para o próximo estágio
          const { data: contactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id')
            .eq('contact_id', message.contact_id)
            .eq('sequence_id', message.sequence_id)
            .eq('status', 'active')
            .single();
          
          if (contactSeqError) {
            console.error(`[CONTACT-SEQ] Erro ao buscar sequência de contato: ${contactSeqError.message}`);
          } else {
            // Atualizar estágio atual
            await supabase
              .from('contact_sequences')
              .update({ 
                current_stage_id: nextStage.id,
                current_stage_index: nextStage.order_index,
                last_message_at: new Date().toISOString()
              })
              .eq('id', contactSequence.id);
            
            // Adicionar progresso do estágio
            await supabase
              .from('stage_progress')
              .insert([{
                contact_sequence_id: contactSequence.id,
                stage_id: nextStage.id,
                status: 'pending'
              }]);
            
            // Calcular o tempo de agendamento para o próximo estágio
            const delayMs = calculateDelayMs(nextStage.delay, nextStage.delay_unit);
            const scheduledTime = new Date(Date.now() + delayMs);
            
            // Agendar próxima mensagem
            await supabase
              .from('scheduled_messages')
              .insert([{
                contact_id: message.contact_id,
                sequence_id: message.sequence_id,
                stage_id: nextStage.id,
                raw_scheduled_time: scheduledTime.toISOString(),
                scheduled_time: scheduledTime.toISOString(),
                status: 'pending'
              }]);
            
            // Incluir informações do próximo estágio na resposta
            responseData.nextStage = {
              id: nextStage.id,
              scheduledTime: scheduledTime.toISOString()
            };
          }
        } else {
          // Não há próximo estágio, completar a sequência
          console.log(`[SEQUENCE] Sequência completada para contato ${message.contact_id}`);
          
          const { data: contactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id')
            .eq('contact_id', message.contact_id)
            .eq('sequence_id', message.sequence_id)
            .eq('status', 'active')
            .single();
          
          if (!contactSeqError && contactSequence) {
            // Marcar sequência como completa
            await supabase
              .from('contact_sequences')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
                last_message_at: new Date().toISOString()
              })
              .eq('id', contactSequence.id);
            
            // Atualizar estatística de sequências completas
            try {
              const { data: sequenceData, error: seqError } = await supabase
                .from('sequences')
                .select('instance_id')
                .eq('id', message.sequence_id)
                .single();
              
              if (!seqError && sequenceData) {
                // Atualizar estatísticas
                const statsData = {
                  instance_id: sequenceData.instance_id,
                  date: new Date().toISOString().split('T')[0],
                  completed_sequences: 1,
                  messages_sent: 0,
                  messages_scheduled: 0,
                  messages_failed: 0,
                  new_contacts: 0
                };
                
                await supabase
                  .from('daily_stats')
                  .upsert(statsData);
              }
            } catch (statsError) {
              console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
            }
          }
        }
      }

    } else if (status === 'failed') {
      // Falhou, mas pode tentar novamente
      const currentAttempts = attempts || (message.attempts || 0) + 1;
      
      if (currentAttempts >= 3) {
        // Muitas tentativas, marcar como erro persistente
        newStatus = 'persistent_error';
      } else {
        // Manter como pendente para nova tentativa
        newStatus = 'pending';
      }
      
      // Atualizar o status da mensagem
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({ 
          status: newStatus,
          attempts: currentAttempts
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error(`[UPDATE] Erro ao atualizar status da mensagem: ${updateError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao atualizar status da mensagem', 
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se for erro persistente, atualizar as estatísticas
      if (newStatus === 'persistent_error') {
        try {
          // Obter a instância associada à sequência
          const { data: sequenceData, error: seqError } = await supabase
            .from('sequences')
            .select('instance_id')
            .eq('id', message.sequence_id)
            .single();
          
          if (!seqError && sequenceData) {
            // Atualizar estatísticas
            const statsData = {
              instance_id: sequenceData.instance_id,
              date: new Date().toISOString().split('T')[0],
              messages_failed: 1,
              messages_sent: 0,
              messages_scheduled: 0,
              completed_sequences: 0,
              new_contacts: 0
            };
            
            await supabase
              .from('daily_stats')
              .upsert(statsData);
          }
        } catch (statsError) {
          console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
        }
      }
    }
    
    responseData.status = newStatus;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status da mensagem atualizado com sucesso',
        ...responseData
      }),
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
