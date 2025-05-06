
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Função pending-messages iniciada!");

serve(async (req) => {
  // Gerenciamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obter mensagens agendadas onde scheduledTime é passado
    // Comentário: agora usamos <= em vez de < para incluir mensagens exatamente no tempo agendado
    const { data: pendingMessages, error: pendingError } = await supabaseClient
      .from('scheduled_messages')
      .select(`
        id,
        sequence_id,
        contact_id,
        stage_id,
        scheduled_time,
        raw_scheduled_time
      `)
      .eq('status', 'waiting')
      .lte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(10);
    
    if (pendingError) {
      console.error("Erro ao buscar mensagens pendentes:", pendingError);
      throw pendingError;
    }

    console.log(`Encontradas ${pendingMessages?.length || 0} mensagens pendentes.`);
    
    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar o status das mensagens para 'pending'
    const messageIds = pendingMessages.map(msg => msg.id);
    const { error: updateError } = await supabaseClient
      .from('scheduled_messages')
      .update({ status: 'pending' })
      .in('id', messageIds);
    
    if (updateError) {
      console.error("Erro ao atualizar status das mensagens:", updateError);
      throw updateError;
    }

    // Array para armazenar os resultados completos
    const processedMessages = [];

    // Processar cada mensagem
    for (const message of pendingMessages) {
      try {
        // Buscar detalhes da sequência
        const { data: sequence, error: sequenceError } = await supabaseClient
          .from('sequences')
          .select(`
            id, 
            name, 
            type,
            instance_id,
            sequence_stages (
              id, 
              name,
              content,
              typebot_stage
            )
          `)
          .eq('id', message.sequence_id)
          .single();
        
        if (sequenceError || !sequence) {
          console.error(`Erro ao buscar sequência ${message.sequence_id}:`, sequenceError);
          continue;
        }

        // Buscar estágio específico
        const stageData = sequence.sequence_stages.find(stage => stage.id === message.stage_id);
        if (!stageData) {
          console.error(`Estágio ${message.stage_id} não encontrado na sequência ${message.sequence_id}`);
          continue;
        }

        // Buscar detalhes da instância
        const { data: instance, error: instanceError } = await supabaseClient
          .from('instances')
          .select('id, name, evolution_api_url, api_key')
          .eq('id', sequence.instance_id)
          .single();
        
        if (instanceError || !instance) {
          console.error(`Erro ao buscar instância ${sequence.instance_id}:`, instanceError);
          continue;
        }

        // Buscar detalhes do contato
        const { data: contact, error: contactError } = await supabaseClient
          .from('contacts')
          .select('id, name, phone_number, inbox_id, conversation_id, display_id, client_id')
          .eq('id', message.contact_id)
          .single();
        
        if (contactError || !contact) {
          console.error(`Erro ao buscar contato ${message.contact_id}:`, contactError);
          continue;
        }

        // Buscar detalhes do cliente
        const { data: client, error: clientError } = await supabaseClient
          .from('clients')
          .select('id, account_id, account_name')
          .eq('id', contact.client_id)
          .single();
        
        if (clientError || !client) {
          console.error(`Erro ao buscar cliente ${contact.client_id}:`, clientError);
          continue;
        }

        // Construir o objeto de resposta
        const messagePayload = {
          id: message.id,
          chatwootData: {
            accountData: {
              accountId: client.account_id,
              accountName: client.account_name
            },
            contactData: {
              id: contact.id,
              name: contact.name,
              phoneNumber: contact.phone_number
            },
            conversation: {
              inboxId: contact.inbox_id,
              conversationId: contact.conversation_id,
              displayId: contact.display_id,
              labels: "" // Não precisamos das tags nesse ponto
            }
          },
          instanceData: {
            id: instance.id,
            name: instance.name,
            evolutionApiUrl: instance.evolution_api_url,
            apiKey: instance.api_key
          },
          sequenceData: {
            instanceName: instance.name,
            sequenceName: sequence.name,
            type: sequence.type, // Tipo agora vem da sequência, não do estágio
            stage: {
              [`${stageData.typebot_stage || 'stg1'}`]: {
                id: stageData.id,
                content: stageData.content,
                rawScheduledTime: message.raw_scheduled_time,
                scheduledTime: message.scheduled_time
              }
            }
          }
        };

        processedMessages.push(messagePayload);
      } catch (error) {
        console.error(`Erro ao processar mensagem ${message.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ messages: processedMessages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro geral na função:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
