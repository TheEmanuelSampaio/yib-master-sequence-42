
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Parse the request body
    const body = await req.text();
    
    // Tentando converter body para JSON
    let jsonData;
    try {
      jsonData = JSON.parse(body);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extrair dados da estrutura correta
    const { data } = jsonData;
    
    if (!data || !data.accountId || !data.accountName || !data.contact || !data.conversation) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados obrigatórios ausentes',
          esperado: {
            data: {
              accountId: 'número ou string',
              accountName: 'string',
              contact: { 
                id: 'number ou string', 
                name: 'string', 
                phoneNumber: 'string' 
              },
              conversation: {
                inboxId: 'number',
                conversationId: 'number',
                displayId: 'number',
                labels: 'string'
              }
            }
          },
          recebido: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountId, accountName } = data;
    const { id: contactId, name: contactName, phoneNumber } = data.contact;
    const { inboxId, conversationId, displayId, labels } = data.conversation;
    
    // Buscar cliente com account_id
    
    // Tentar como número primeiro
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', Number(accountId))
      .limit(1);
    
    if (clientError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar cliente', 
          details: clientError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let client = null;
    
    // Se não encontrou como número, tentar como string
    if (!clientData || clientData.length === 0) {
      const { data: clientDataStr, error: clientErrorStr } = await supabase
        .from('clients')
        .select('*')
        .eq('account_id', String(accountId))
        .limit(1);
      
      if (clientErrorStr) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar cliente como string', 
            details: clientErrorStr.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (clientDataStr && clientDataStr.length > 0) {
        client = clientDataStr[0];
      }
    } else {
      client = clientData[0];
    }
    
    // Se ainda não encontrou o cliente, criar um novo
    if (!client) {
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([
          { 
            account_id: accountId, 
            account_name: accountName, 
            created_by: 'system', 
            creator_account_name: 'Sistema (Auto)'
          }
        ])
        .select();
      
      if (createError) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar cliente', 
            details: createError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      client = newClient[0];
    }
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    
    // Verificar se já existe um contato para esse número e account_id
    const { data: existingContacts, error: contactQueryError } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('client_id', client.id);
    
    if (contactQueryError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar contato', 
          details: contactQueryError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let contact = null;
    
    // Criar ou atualizar contato
    if (!existingContacts || existingContacts.length === 0) {
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert([
          {
            id: `${client.id}:${String(contactId)}`, // ID único combinando cliente e ID do contato
            client_id: client.id,
            name: contactName,
            phone_number: phoneNumber,
            conversation_id: conversationId,
            display_id: displayId,
            inbox_id: inboxId
          }
        ])
        .select();
      
      if (createContactError) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar contato', 
            details: createContactError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      contact = newContact[0];
    } else {
      contact = existingContacts[0];
      
      // Atualizar informações do contato se necessário
      const { error: updateContactError } = await supabase
        .from('contacts')
        .update({
          name: contactName,
          conversation_id: conversationId,
          display_id: displayId,
          inbox_id: inboxId
        })
        .eq('id', contact.id);
      
      if (updateContactError) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao atualizar contato', 
            details: updateContactError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Estatísticas para o payload de resposta
    let tagsAdded = 0;
    let existingTags = 0;
    let tagErrors = 0;
    
    // 1. Verificar se as tags existem e criar as que não existem
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Verificar se a tag já existe para este created_by
        const { data: existingTag, error: tagQueryError } = await supabase
          .from('tags')
          .select('*')
          .eq('name', tagName)
          .eq('created_by', client.created_by);
        
        if (tagQueryError) {
          tagErrors++;
          continue;
        }
        
        // Se a tag não existe, criá-la
        if (!existingTag || existingTag.length === 0) {
          try {
            // Inserir tag usando a função RPC com os parâmetros na ordem correta
            const { error: upsertError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
              p_name: tagName,
              p_created_by: client.created_by
            });
            
            if (upsertError) {
              tagErrors++;
              continue;
            } else {
              tagsAdded++;
            }
          } catch (err) {
            tagErrors++;
            continue;
          }
        } else {
          existingTags++;
        }
      }
    }
    
    // Atualizar tags do contato
    if (tags.length > 0) {
      // Primeiro remover tags existentes
      const { error: deleteTagsError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contact.id);
      
      if (deleteTagsError) {
        tagErrors++;
      }
      
      // Inserir novas tags
      const tagInserts = tags.map(tag => ({
        contact_id: contact.id,
        tag_name: tag
      }));
      
      if (tagInserts.length > 0) {
        const { error: insertTagsError } = await supabase
          .from('contact_tags')
          .insert(tagInserts);
        
        if (insertTagsError) {
          tagErrors++;
        }
      }
    }
    
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
          tags
        },
        stats: {
          tagsAdded,
          existingTags,
          tagErrors
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
