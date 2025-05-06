
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Logs de inicialização
console.log(`[INIT] Inicializando função pending-messages`);
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
      console.log(`[PARSE] JSON parseado com sucesso`);
    } catch (parseError) {
      console.error(`[PARSE] Erro ao parsear JSON: ${parseError.message}`);
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pegar mensagens pendentes com horário de envio menor ou igual que o horário atual
    console.log(`[QUERY] Buscando mensagens pendentes...`);
    const now = new Date();
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('scheduled_messages')
      .select(`
        id,
        status,
        scheduled_time,
        raw_scheduled_time,
        contacts!inner(
          id, 
          name, 
          phone_number, 
          client_id,
          inbox_id,
          conversation_id,
          display_id
        ),
        sequences!inner(
          id, 
          name,
          type,
          instances!inner(
            id, 
            name, 
            evolution_api_url, 
            api_key
          )
        ),
        sequence_stages!inner(
          id, 
          name, 
          content
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString()) // Alterado para menor ou igual
      .order('scheduled_time', { ascending: true })
      .limit(10); // Limitar a 10 mensagens por vez para evitar sobrecarga

    if (messagesError) {
      console.error(`[QUERY] Erro ao buscar mensagens pendentes: ${messagesError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar mensagens pendentes', 
          details: messagesError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não houver mensagens pendentes, retornar array vazio
    if (!pendingMessages || pendingMessages.length === 0) {
      console.log(`[RESULT] Nenhuma mensagem pendente encontrada`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          messages: [] 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RESULT] Encontradas ${pendingMessages.length} mensagens pendentes`);

    // Marcar as mensagens como "processing"
    const messageIds = pendingMessages.map(msg => msg.id);
    
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update({ status: 'processing' })
      .in('id', messageIds);

    if (updateError) {
      console.error(`[UPDATE] Erro ao atualizar status das mensagens: ${updateError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao atualizar status das mensagens', 
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter tags de contatos para incluir no payload
    const contactIds = pendingMessages.map(msg => msg.contacts.id);
    const { data: contactTags, error: tagsError } = await supabase
      .from('contact_tags')
      .select('contact_id, tag_name')
      .in('contact_id', contactIds);

    if (tagsError) {
      console.log(`[TAGS] Erro ao buscar tags dos contatos: ${tagsError.message}`);
    }

    // Agrupar tags por contato
    const tagsByContact = {};
    contactTags?.forEach(tag => {
      if (!tagsByContact[tag.contact_id]) {
        tagsByContact[tag.contact_id] = [];
      }
      tagsByContact[tag.contact_id].push(tag.tag_name);
    });

    // Formatar mensagens no formato esperado pelo N8N
    const formattedMessages = pendingMessages.map(msg => {
      const contact = msg.contacts;
      const sequence = msg.sequences;
      const stage = msg.sequence_stages;
      const instance = sequence.instances;
      
      // Obter tags do contato, se existirem
      const contactTagsList = tagsByContact[contact.id] || [];
      
      return {
        id: msg.id,
        chatwootData: {
          accountData: {
            accountId: contact.client_id,
            accountName: "Account Name" // Idealmente, buscar o nome da conta, mas não temos isso no JOIN acima
          },
          contactData: {
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phone_number,
          },
          conversationData: {
            inboxId: contact.inbox_id,
            conversationId: contact.conversation_id,
            displayId: contact.display_id,
            labels: contactTagsList.join(", ")
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
          type: sequence.type,  // Agora usando o tipo da sequência, não do estágio
          stage: {
            [`stg${stage.id}`]: {
              id: stage.id,
              content: stage.content,
              rawScheduledTime: msg.raw_scheduled_time,
              scheduledTime: msg.scheduled_time
            }
          }
        }
      };
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messages: formattedMessages,
        meta: {
          count: formattedMessages.length,
          processedAt: now.toISOString()
        },
        logs: [
          { level: 'info', message: `[RESULT] Processadas ${formattedMessages.length} mensagens pendentes` }
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
