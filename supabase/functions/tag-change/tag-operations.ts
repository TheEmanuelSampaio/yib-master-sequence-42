
import { corsHeaders } from '../_shared/cors.ts';

export async function handleTags(supabase: any, tags: string[], client: any, contact: any) {
  // Estatísticas para o payload de resposta
  let tagsAdded = 0;
  let existingTags = 0;
  let tagErrors = 0;
  
  // 1. Verificar se as tags existem e criar as que não existem
  if (tags.length > 0) {
    console.log(`[4. TAGS] Processando ${tags.length} tags...`);
    for (const tagName of tags) {
      // Verificar se a tag já existe
      const { data: existingTag, error: tagQueryError } = await supabase
        .from('tags')
        .select('*')
        .eq('name', tagName)
        .eq('created_by', client.created_by);
      
      if (tagQueryError) {
        console.error(`[4. TAGS] Erro ao consultar tag ${tagName}: ${JSON.stringify(tagQueryError)}`);
        tagErrors++;
        continue;
      }
      
      // Se a tag não existe, criá-la
      if (!existingTag || existingTag.length === 0) {
        try {
          console.log(`[4. TAGS] Criando nova tag: ${tagName} (criador: ${client.created_by})`);
          // Inserir tag usando a função RPC com os parâmetros na ordem correta
          const { error: upsertError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
            p_name: tagName,
            p_created_by: client.created_by
          });
          
          if (upsertError) {
            console.error(`[4. TAGS] Erro ao criar tag ${tagName}: ${JSON.stringify(upsertError)}`);
            tagErrors++;
            continue;
          } else {
            tagsAdded++;
          }
        } catch (err) {
          console.error(`[4. TAGS] Exceção ao criar tag ${tagName}: ${JSON.stringify(err)}`);
          tagErrors++;
          continue;
        }
      } else {
        console.log(`[4. TAGS] Tag já existente: ${tagName}`);
        existingTags++;
      }
    }
  }
  
  // Atualizar tags do contato
  if (tags.length > 0) {
    console.log(`[4. TAGS] Atualizando tags do contato: ${contact.id}`);
    // Primeiro remover tags existentes
    const { error: deleteTagsError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contact.id);
    
    if (deleteTagsError) {
      console.error(`[4. TAGS] Erro ao remover tags existentes: ${JSON.stringify(deleteTagsError)}`);
      tagErrors++;
    }
    
    // Inserir novas tags
    const tagInserts = tags.map(tag => ({
      contact_id: contact.id,
      tag_name: tag
    }));
    
    if (tagInserts.length > 0) {
      console.log(`[4. TAGS] Inserindo ${tagInserts.length} novas tags para o contato`);
      const { error: insertTagsError } = await supabase
        .from('contact_tags')
        .insert(tagInserts);
      
      if (insertTagsError) {
        console.error(`[4. TAGS] Erro ao inserir novas tags: ${JSON.stringify(insertTagsError)}`);
        tagErrors++;
      } else {
        console.log(`[4. TAGS] Tags adicionadas com sucesso`);
      }
    }
  }
  
  return {
    success: true,
    stats: {
      tagsAdded,
      existingTags,
      tagErrors
    }
  };
}
