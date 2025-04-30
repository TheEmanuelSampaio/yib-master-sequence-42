
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

    const { data } = jsonData;
    
    if (!data || !data.messageId || !data.status) {
      console.error(`[VALIDATE] Dados obrigatórios ausentes:`, JSON.stringify({
        temData: !!data,
        temMessageId: data ? !!data.messageId : false,
        temStatus: data ? !!data.status : false
      }));
      
      return new Response(
        JSON.stringify({ 
          error: 'Dados obrigatórios ausentes',
          esperado: {
            data: {
              messageId: 'uuid da mensagem',
              status: 'success ou failed',
              attempts: 'opcional - número de tentativas'
            }
          },
          recebido: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messageId, status, attempts = 1 } = data;
    const now = new Date().toISOString();
    
    // Atualizar status da mensagem
    console.log(`[UPDATE] Atualizando status da mensagem ${messageId} para ${status === 'success' ? 'sent' : 'failed'}`);
    
    // Determinar qual status definir com base na resposta
    let newStatus = 'pending'; // Valor padrão
    let updateData = {};
    
    if (status === 'success') {
      newStatus = 'sent';
      updateData = {
        status: newStatus,
        sent_at: now
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
    
    // Se foi um sucesso, podemos avançar o contato na sequência
    if (status === 'success') {
      console.log(`[SEQUENCE] Buscando informações da mensagem para avançar o contato na sequência`);
      
      // Primeiro, obter os dados da mensagem para saber qual sequência e contato
      const { data: messageData, error: messageError } = await supabase
        .from('scheduled_messages')
        .select('contact_id, sequence_id, stage_id')
        .eq('id', messageId)
        .single();
      
      if (messageError) {
        console.error(`[SEQUENCE] Erro ao buscar informações da mensagem: ${messageError.message}`);
      } else if (messageData) {
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
        } else if (contactSequence) {
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
          }
          
          // Buscar o próximo estágio da sequência
          const { data: stages, error: stagesError } = await supabase
            .from('sequence_stages')
            .select('id, order_index')
            .eq('sequence_id', sequence_id)
            .order('order_index', { ascending: true });
            
          if (stagesError) {
            console.error(`[STAGES] Erro ao buscar estágios da sequência: ${stagesError.message}`);
          } else if (stages && stages.length > 0) {
            // Encontrar o índice do estágio atual
            const currentIndex = contactSequence.current_stage_index;
            const nextIndex = currentIndex + 1;
            
            // Verificar se há um próximo estágio
            const nextStage = stages.find(s => s.order_index === nextIndex);
            
            if (nextStage) {
              // Atualizar para o próximo estágio
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
              } else {
                console.log(`[SEQUENCE] Contato avançado para o estágio ${nextIndex}`);
                
                // Adicionar o novo estágio como pendente
                const { error: newProgressError } = await supabase
                  .from('stage_progress')
                  .insert({
                    contact_sequence_id: contactSequence.id,
                    stage_id: nextStage.id,
                    status: 'pending'
                  });
                  
                if (newProgressError) {
                  console.error(`[PROGRESS] Erro ao criar registro de progresso: ${newProgressError.message}`);
                }
              }
            } else {
              // Se não há mais estágios, marcar a sequência como concluída
              console.log(`[SEQUENCE] Nenhum próximo estágio encontrado. Marcando sequência como concluída.`);
              
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
              } else {
                console.log(`[SEQUENCE] Sequência marcada como concluída com sucesso`);
                
                // Atualizar estatísticas diárias
                const today = new Date().toISOString().split('T')[0];
                
                // Obter a instância a partir da sequência
                const { data: seqData } = await supabase
                  .from('sequences')
                  .select('instance_id')
                  .eq('id', sequence_id)
                  .single();
                  
                if (seqData) {
                  // Incrementar contadores de estatísticas
                  const { error: statsError } = await supabase.rpc('increment_daily_stats', {
                    instance_id: seqData.instance_id,
                    stat_date: today,
                    completed_seqs: 1,
                    msgs_sent: 0,
                    msgs_failed: 0,
                    msgs_scheduled: 0,
                    new_contacts: 0
                  });
                  
                  if (statsError) {
                    console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Atualizar estatísticas diárias
    const today = new Date().toISOString().split('T')[0];
    
    // Primeiro, vamos obter a instância relacionada à mensagem
    const { data: messageWithInstance } = await supabase
      .from('scheduled_messages')
      .select(`
        sequences!inner(
          instance_id
        )
      `)
      .eq('id', messageId)
      .single();
      
    if (messageWithInstance) {
      const instanceId = messageWithInstance.sequences.instance_id;
      
      // Incrementar os contadores apropriados
      let msgsSent = 0;
      let msgsFailed = 0;
      
      if (status === 'success') {
        msgsSent = 1;
      } else {
        msgsFailed = 1;
      }
      
      const { error: statsError } = await supabase.rpc('increment_daily_stats', {
        instance_id: instanceId,
        stat_date: today,
        completed_seqs: 0,
        msgs_sent: msgsSent,
        msgs_failed: msgsFailed,
        msgs_scheduled: 0,
        new_contacts: 0
      });
      
      if (statsError) {
        console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Status da mensagem atualizado para ${newStatus}`,
        messageId,
        status: newStatus,
        processedAt: now,
        logs: [
          { level: 'info', message: `[UPDATE] Status da mensagem ${messageId} atualizado para ${newStatus}` }
        ]
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
