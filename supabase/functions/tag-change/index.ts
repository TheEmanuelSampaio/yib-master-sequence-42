
import { corsHeaders } from '../_shared/cors.ts';
import { handleError } from '../_shared/db.ts';
import { findOrCreateClient } from './clients.ts';
import { findOrCreateContact, getContactTags } from './contacts.ts';
import { processContactTags } from './tags.ts';
import { findEligibleSequences } from './sequences.ts';

// Função principal que processa a mudança de tags
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[INIT] Inicializando função tag-change');
    
    // Parse the request body
    const body = await req.text();
    
    // Tentando converter body para JSON
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log(`[1. BODY] Body recebido: ${body}`);
      console.log(`[1. BODY] JSON parseado com sucesso`);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extrair dados da estrutura
    let data;
    
    // Suportar diferentes formatos de payload
    if (jsonData.data) {
      // Formato: { data: { ... } }
      data = jsonData.data;
      console.log(`[1. BODY] Formato utilizado: data direto`);
    } else if (jsonData.chatwootData) {
      // Formato: { chatwootData: { accountData: {...}, contactData: {...}, conversationData: {...} } }
      data = {
        accountData: jsonData.chatwootData.accountData,
        contactData: jsonData.chatwootData.contactData,
        conversationData: jsonData.chatwootData.conversationData
      };
      console.log(`[1. BODY] Formato utilizado: chatwootData`);
    } else if (jsonData.body && jsonData.body.chatwootData) {
      // Formato: { body: { chatwootData: { accountData: {...}, contactData: {...}, conversationData: {...} } } }
      data = {
        accountData: jsonData.body.chatwootData.accountData,
        contactData: jsonData.body.chatwootData.contactData,
        conversationData: jsonData.body.chatwootData.conversationData
      };
      console.log(`[1. BODY] Formato utilizado: body.chatwootData`);
    } else {
      // Tentar usar o payload diretamente
      if (jsonData.accountData || jsonData.contactData || jsonData.conversationData) {
        data = jsonData;
        console.log(`[1. BODY] Formato utilizado: dados diretos na raiz`);
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Formato de dados desconhecido',
            esperado: {
              data: {
                accountData: { accountId: 'string/number', accountName: 'string' },
                contactData: { id: 'string/number', name: 'string', phoneNumber: 'string' },
                conversationData: { inboxId: 'number', conversationId: 'number', displayId: 'number', labels: 'string' }
              }
            },
            recebido: jsonData
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validar dados obrigatórios
    if (!data || !data.accountData || !data.contactData || !data.conversationData) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados obrigatórios ausentes',
          esperado: {
            accountData: { accountId: 'string/number', accountName: 'string' },
            contactData: { id: 'string/number', name: 'string', phoneNumber: 'string' },
            conversationData: { inboxId: 'number', conversationId: 'number', displayId: 'number', labels: 'string' }
          },
          recebido: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountData, contactData, conversationData } = data;
    
    if (!accountData.accountId || !accountData.accountName || !contactData.id || 
        !contactData.phoneNumber || !conversationData.conversationId) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes nos dados',
          recebido: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log dos dados processados
    console.log(`[1. BODY] Processando dados: contactId=${contactData.id}, name=${contactData.name}, phoneNumber=${contactData.phoneNumber}, accountId=${accountData.accountId}, accountName=${accountData.accountName}, tags=${conversationData.labels}`);
    
    // Etapa 1: Buscar ou criar cliente
    const client = await findOrCreateClient(accountData.accountId, accountData.accountName);
    
    // Etapa 2: Buscar ou criar contato
    const contact = await findOrCreateContact(
      client.id,
      contactData.id,
      contactData.name || 'Sem nome',
      contactData.phoneNumber,
      conversationData.conversationId,
      conversationData.displayId,
      conversationData.inboxId
    );
    
    // Etapa 3: Processar tags do contato
    const tagStats = await processContactTags(
      contact.id,
      client.created_by,
      conversationData.labels || ''
    );
    
    // Etapa 4: Obter tags atuais do contato para verificar sequências
    const contactTags = await getContactTags(contact.id);
    
    // Etapa 5: Verificar sequências elegíveis
    const sequenceStats = await findEligibleSequences(client.id, contact.id, contactTags);
    
    // Log final e resposta
    console.log(`[6. RESPOSTA] Processamento concluído. Contato: ${contact.id}, Cliente: ${client.id} (${client.account_name})`);
    console.log(`[6. RESPOSTA] Tags adicionadas: ${tagStats.tagsAdded} sucesso, ${tagStats.tagErrors} falhas`);
    console.log(`[6. RESPOSTA] Sequências: ${sequenceStats.eligibleCount} elegíveis, ${sequenceStats.addedCount} adicionadas, ${sequenceStats.removedCount} removidas`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contato processado com sucesso',
        client: {
          id: client.id,
          accountName: client.account_name,
          accountId: client.account_id
        },
        contact: {
          id: contact.id,
          name: contact.name,
          tags: contactTags
        },
        stats: {
          tags: {
            added: tagStats.tagsAdded,
            errors: tagStats.tagErrors
          },
          sequences: {
            eligible: sequenceStats.eligibleCount,
            added: sequenceStats.addedCount,
            removed: sequenceStats.removedCount,
            addedTo: sequenceStats.addedToSequences
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return handleError(error, 'Erro interno do servidor');
  }
});
