
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ChatwootData, TagChangeResponse } from '../_shared/types.ts';
import { getSupabaseClient, getSupabaseServiceClient, createResponse, createErrorResponse } from '../_shared/db-helpers.ts';
import { findOrCreateClient } from './clients.ts';
import { findOrCreateContact } from './contacts.ts';
import { processContactTags } from './tags.ts';
import { processEligibleSequences } from './sequences.ts';

console.log("[INIT] Inicializando função tag-change");

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize both normal and service role Supabase clients
    const supabase = getSupabaseClient();
    const supabaseAdmin = getSupabaseServiceClient();
    
    // Verificar se conseguiu o cliente service role
    if (!supabaseAdmin) {
      console.error('[CRÍTICO] Não foi possível inicializar o cliente Supabase com service role');
      return createErrorResponse('Erro na configuração do servidor', null, 500);
    }
    
    // Usar supabase normal para operações iniciais

    // Verify if it's a POST request and parse request body
    if (req.method !== 'POST') {
      return createErrorResponse('Método não permitido', null, 405);
    }

    // [1. BODY RECEIVED] - Parse the body
    const body = await req.text();
    console.log(`[1. BODY] Body recebido: ${body}`);
    
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log(`[1. BODY] JSON parseado com sucesso`);
    } catch (parseError: any) {
      console.error(`[1. BODY] Erro ao parsear JSON: ${parseError.message}`);
      return createErrorResponse('Payload JSON inválido', { details: parseError.message }, 400);
    }

    // Extract relevant data - support multiple formats (backward compatibility)
    let chatwootData = extractChatwootData(jsonData);
    
    if (!chatwootData) {
      console.error(`[1. BODY] Dados do Chatwoot ausentes`, JSON.stringify(jsonData));
      return createErrorResponse('Dados do Chatwoot ausentes', {
        formatoEsperado: {
          "opção 1": { "body": { "chatwootData": { "accountData": {}, "contactData": {}, "conversationData": {} } } },
          "opção 2": { "chatwootData": { "accountData": {}, "contactData": {}, "conversationData": {} } },
          "opção 3": { "data": { "accountData": {}, "contactData": {}, "conversationData": {} } }
        },
        recebido: jsonData
      }, 400);
    }

    const { accountData, contactData, conversationData } = chatwootData;
    
    if (!accountData || !contactData || !conversationData) {
      console.error(`[1. BODY] Dados incompletos no payload:`, JSON.stringify({
        temAccountData: !!accountData,
        temContactData: !!contactData,
        temConversationData: !!conversationData
      }));
      return createErrorResponse('Dados incompletos', {
        detalhes: {
          temAccountData: !!accountData,
          temContactData: !!contactData,
          temConversationData: !!conversationData
        },
        recebido: chatwootData
      }, 400);
    }

    // Extract contact data
    const { id: contactId, name, phoneNumber } = contactData;
    const { inboxId, conversationId, displayId, labels: labelsString } = conversationData;
    const { accountId, accountName } = accountData;

    console.log(`[1. BODY] Processando dados: contactId=${contactId}, name=${name}, phoneNumber=${phoneNumber}, accountId=${accountId}, accountName=${accountName}, tags=${labelsString}`);

    // [2. CLIENT VERIFICATION] - Find or create client for Chatwoot account
    const existingClient = await findOrCreateClient(supabaseAdmin, accountId, accountName);

    // [3. CONTACT VERIFICATION] - Find or create contact
    await findOrCreateContact(
      supabaseAdmin,
      contactId,
      name,
      phoneNumber,
      inboxId,
      conversationId,
      displayId,
      existingClient.id
    );

    // [4. TAG PROCESSING] - Process tags (labels)
    const tags = labelsString ? labelsString.split(',').map(tag => tag.trim()) : [];
    const tagResults = await processContactTags(supabaseAdmin, contactId.toString(), labelsString, existingClient.created_by);

    // [5. SEQUENCE VERIFICATION] - Check and process eligible sequences
    const sequenceResults = await processEligibleSequences(supabaseAdmin, existingClient.id, contactId.toString(), tags);

    // [6. RESPONSE] - Respond with success and statistics
    console.log(`[6. RESPOSTA] Processamento concluído. Contato: ${contactId}, Cliente: ${existingClient.id} (${existingClient.account_name})`);
    console.log(`[6. RESPOSTA] Tags adicionadas: ${tagResults.tagsAddedSuccess} sucesso, ${tagResults.tagsAddedFail} falhas`);
    console.log(`[6. RESPOSTA] Sequências: ${sequenceResults.eligibleSequences} elegíveis, ${sequenceResults.addedSequences} adicionadas, ${sequenceResults.removedSequences} removidas`);
    
    const response: TagChangeResponse = {
      success: true,
      message: 'Contato e tags processados com sucesso',
      details: {
        contactId: contactId.toString(),
        clientId: existingClient.id,
        clientName: existingClient.account_name,
        accountId: accountId,
        tagsAdded: tagResults.tagsAdded,
        tagsRemoved: tagResults.tagsRemoved,
        tagsAddedSuccess: tagResults.tagsAddedSuccess,
        tagsAddedFail: tagResults.tagsAddedFail,
        tagErrors: tagResults.tagErrors,
        eligibleSequences: sequenceResults.eligibleSequences,
        addedToSequences: sequenceResults.addedSequences,
        removedFromSequences: sequenceResults.removedSequences
      }
    };
    
    return createResponse(response);
  } catch (error: any) {
    console.error(`[CRITICAL] Erro não tratado: ${error.message}`);
    console.error(error.stack);
    return createErrorResponse(
      'Erro interno do servidor', 
      { details: error.message, stack: error.stack },
      500
    );
  }
});

// Helper function to extract Chatwoot data from different payload formats
function extractChatwootData(jsonData: any): ChatwootData | null {
  let chatwootData = null;
  
  // Format 1: { body: { chatwootData: {...} } }
  if (jsonData.body && jsonData.body.chatwootData) {
    chatwootData = jsonData.body.chatwootData;
    console.log(`[1. BODY] Formato utilizado: body.chatwootData`);
  } 
  // Format 2: { chatwootData: {...} } 
  else if (jsonData.chatwootData) {
    chatwootData = jsonData.chatwootData;
    console.log(`[1. BODY] Formato utilizado: chatwootData direto`);
  } 
  // Format 3: { data: {...} } where data contains direct data
  else if (jsonData.data) {
    chatwootData = jsonData.data;
    console.log(`[1. BODY] Formato utilizado: data direto`);
  }
  
  return chatwootData;
}
