
// Make sure to add any imports and update function signatures as needed

export async function handleTags(supabase: any, tags: string[], client: any, contact: any) {
  console.log(`[TAGS] Processando ${tags.length} tags para o contato ${contact.id}`);
  
  try {
    // Manter um conjunto de tags atuais para comparação
    const { data: currentTags, error: currentTagsError } = await supabase
      .from('contact_tags')
      .select('tag_name')
      .eq('contact_id', contact.id);
    
    if (currentTagsError) {
      console.error(`[TAGS] Erro ao buscar tags atuais: ${JSON.stringify(currentTagsError)}`);
      return { 
        success: false, 
        error: 'Falha ao buscar tags atuais', 
        details: currentTagsError
      };
    }
    
    const currentTagNames = new Set(currentTags.map((t: any) => t.tag_name));
    const newTagNames = new Set(tags);
    
    let tagsAdded = 0;
    let tagsRemoved = 0;
    let tagsMaintained = 0;
    
    // Identificar tags para adicionar (estão em newTagNames mas não em currentTagNames)
    const tagsToAdd = [...newTagNames].filter(tag => !currentTagNames.has(tag));
    
    // Identificar tags para remover (estão em currentTagNames mas não em newTagNames)
    const tagsToRemove = [...currentTagNames].filter(tag => !newTagNames.has(tag));
    
    // Identificar tags mantidas (estão em ambos os conjuntos)
    const tagsMaintainedList = [...currentTagNames].filter(tag => newTagNames.has(tag));
    tagsMaintained = tagsMaintainedList.length;
    
    console.log(`[TAGS] Tags a adicionar: ${tagsToAdd.join(', ')}`);
    console.log(`[TAGS] Tags a remover: ${tagsToRemove.join(', ')}`);
    
    // Adicionar novas tags
    if (tagsToAdd.length > 0) {
      const tagInserts = tagsToAdd.map(tagName => ({
        contact_id: contact.id,
        tag_name: tagName
      }));
      
      const { error: insertError } = await supabase
        .from('contact_tags')
        .insert(tagInserts);
      
      if (insertError) {
        console.error(`[TAGS] Erro ao inserir tags: ${JSON.stringify(insertError)}`);
        return { 
          success: false, 
          error: 'Falha ao inserir tags novas', 
          details: insertError
        };
      }
      
      tagsAdded = tagsToAdd.length;
      
      // Inserir cada tag no sistema global de tags (se não existir)
      for (const tagName of tagsToAdd) {
        // Usar uma função RPC que faz um insert condicional
        const { error: rpcError } = await supabase.rpc(
          'insert_tag_if_not_exists_for_user',
          { 
            p_name: tagName, 
            p_created_by: client.created_by || 'system' 
          }
        );
        
        if (rpcError) {
          console.warn(`[TAGS] Aviso: não foi possível inserir tag global: ${tagName}`, rpcError);
        }
      }
    }
    
    // Remover tags que não estão mais presentes
    if (tagsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contact.id)
        .in('tag_name', tagsToRemove);
      
      if (deleteError) {
        console.error(`[TAGS] Erro ao remover tags: ${JSON.stringify(deleteError)}`);
        return { 
          success: false, 
          error: 'Falha ao remover tags antigas', 
          details: deleteError
        };
      }
      
      tagsRemoved = tagsToRemove.length;
    }
    
    console.log(`[TAGS] Tags processadas com sucesso: ${tagsAdded} adicionadas, ${tagsRemoved} removidas, ${tagsMaintained} mantidas`);
    
    return {
      success: true,
      stats: {
        tagsAdded,
        tagsRemoved,
        tagsMaintained
      }
    };
    
  } catch (error) {
    console.error(`[TAGS] Erro ao processar tags: ${JSON.stringify(error)}`);
    return { 
      success: false, 
      error: 'Erro interno ao processar tags', 
      details: error 
    };
  }
}
