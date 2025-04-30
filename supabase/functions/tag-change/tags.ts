
import { createServiceClient } from '../_shared/db.ts';

// Funções para gerenciar tags
export const processContactTags = async (contactId: string, clientCreatedBy: string, newTagsString: string) => {
  const supabase = createServiceClient();
  
  // Parse tags do input
  const newTags = newTagsString 
    ? newTagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean) 
    : [];
  
  console.log(`[4. TAGS] Processando tags: "${newTagsString}"`);
  
  // Buscar tags existentes do contato
  const { data: existingTags, error: tagsQueryError } = await supabase
    .from('contact_tags')
    .select('tag_name')
    .eq('contact_id', contactId);
  
  if (tagsQueryError) {
    console.error(`[4. TAGS] Erro ao buscar tags atuais:`, tagsQueryError);
    throw tagsQueryError;
  }
  
  const currentTags = existingTags ? existingTags.map(t => t.tag_name) : [];
  console.log(`[4. TAGS] Tags atuais do contato: ${JSON.stringify(currentTags)}`);
  console.log(`[4. TAGS] Novas tags a processar: ${JSON.stringify(newTags)}`);
  
  // Encontrar tags que precisam ser adicionadas e removidas
  const tagsToAdd = newTags.filter(tag => !currentTags.includes(tag));
  const tagsToRemove = currentTags.filter(tag => !newTags.includes(tag));
  
  console.log(`[4. TAGS] Tags a adicionar ao contato: ${JSON.stringify(tagsToAdd)}`);
  console.log(`[4. TAGS] Tags a remover do contato: ${JSON.stringify(tagsToRemove)}`);
  
  // Estatísticas para o payload de resposta
  let tagsAdded = 0;
  let existingTagCount = 0;
  let tagErrors = 0;
  
  // Usar o created_by do cliente para criar tags
  const createdById = clientCreatedBy === 'system' 
    ? '00000000-0000-0000-0000-000000000000' 
    : clientCreatedBy;
  
  console.log(`[4. TAGS] Usuário para criação de tags: ${createdById}`);
  
  // Utilizando função RPC para inserir tags com segurança
  console.log(`[4. TAGS] Utilizando função SQL para inserir tags com usuário ${createdById}`);
  
  // 1. Verificar se as tags existem e criar as que não existem
  if (tagsToAdd.length > 0) {
    for (const tagName of tagsToAdd) {
      try {
        // Inserir tag usando a função RPC com os parâmetros na ordem correta
        const { error: upsertError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
          p_name: tagName,
          p_created_by: createdById
        });
        
        if (upsertError) {
          console.error(`[4. TAGS] Erro ao inserir tag "${tagName}":`, upsertError);
          tagErrors++;
        } else {
          tagsAdded++;
          console.log(`[4. TAGS] Tag "${tagName}" criada/verificada com sucesso`);
        }
      } catch (err) {
        console.error(`[4. TAGS] Exceção ao inserir tag "${tagName}":`, err);
        tagErrors++;
      }
    }
  }
  
  // Atualizar tags do contato (remover todas e adicionar as novas)
  try {
    // Primeiro remover tags existentes
    const { error: deleteTagsError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId);
    
    if (deleteTagsError) {
      console.error(`[4. TAGS] Erro ao remover tags existentes:`, deleteTagsError);
      tagErrors++;
    } else {
      console.log(`[4. TAGS] Tags existentes removidas com sucesso`);
    }
    
    // Inserir novas tags
    if (newTags.length > 0) {
      const tagInserts = newTags.map(tag => ({
        contact_id: contactId,
        tag_name: tag
      }));
      
      const { error: insertTagsError } = await supabase
        .from('contact_tags')
        .insert(tagInserts);
      
      if (insertTagsError) {
        console.error(`[4. TAGS] Erro ao inserir novas tags:`, insertTagsError);
        tagErrors++;
      } else {
        console.log(`[4. TAGS] ${newTags.length} novas tags inseridas com sucesso`);
        existingTagCount = newTags.length;
      }
    }
  } catch (error) {
    console.error(`[4. TAGS] Erro ao atualizar tags do contato:`, error);
    tagErrors++;
  }
  
  return { tagsAdded, existingTagCount, tagErrors };
};
