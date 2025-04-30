
import { logQueryError } from '../_shared/db-helpers.ts';

// Process tags for a contact
export const processContactTags = async (supabase: any, contactId: string, labelsString: string, createdBy: string) => {
  console.log(`[4. TAGS] Processando tags: "${labelsString}"`);
  const tags = labelsString ? labelsString.split(',').map(tag => tag.trim()) : [];
  
  // Fetch all current tags for the contact
  const { data: existingTags, error: tagsError } = await supabase
    .from('contact_tags')
    .select('tag_name')
    .eq('contact_id', contactId);
    
  if (tagsError) {
    logQueryError('4. TAGS', tagsError);
  }
  
  const currentTags = existingTags ? existingTags.map(t => t.tag_name) : [];
  console.log(`[4. TAGS] Tags atuais do contato: ${JSON.stringify(currentTags)}`);
  console.log(`[4. TAGS] Novas tags a processar: ${JSON.stringify(tags)}`);
  
  // Tags to be added (in the new list but not in current)
  const tagsToAdd = tags.filter(tag => !currentTags.includes(tag));
  console.log(`[4. TAGS] Tags a adicionar ao contato: ${JSON.stringify(tagsToAdd)}`);
  
  // Tags to be removed (in the current list but not in new)
  const tagsToRemove = currentTags.filter(tag => !tags.includes(tag));
  console.log(`[4. TAGS] Tags a remover do contato: ${JSON.stringify(tagsToRemove)}`);
  
  // Get a valid user for tag creation
  const tagCreationUser = await findValidUserForTagCreation(supabase, createdBy);
  
  // Add new tags
  const { tagsAddedSuccess, tagsAddedFail, tagErrors } = await addNewTags(supabase, tagsToAdd, contactId, tagCreationUser);
  
  // Remove tags that are no longer present
  await removeTagsFromContact(supabase, tagsToRemove, contactId);
  
  return {
    tagsAdded: tagsToAdd.length,
    tagsRemoved: tagsToRemove.length,
    tagsAddedSuccess,
    tagsAddedFail,
    tagErrors
  };
};

// Find a valid user for tag creation
const findValidUserForTagCreation = async (supabase: any, createdBy: string) => {
  console.log(`[4. TAGS] Usuário para criação de tags: ${createdBy}`);
  
  // Verify if the user exists
  let userExists = false;
  if (createdBy !== '00000000-0000-0000-0000-000000000000') {
    const { data: userCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', createdBy)
      .maybeSingle();
    
    userExists = !!userCheck;
    console.log(`[4. TAGS] Verificação do usuário ${createdBy}: ${userExists ? 'Encontrado' : 'Não encontrado'}`);
  } else {
    console.log(`[4. TAGS] Usando usuário do sistema (00000000-0000-0000-0000-000000000000)`);
  }
  
  // If creator not found, find any valid user
  let tagCreationUser = createdBy;
  if (!userExists) {
    const { data: firstUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (firstUser) {
      tagCreationUser = firstUser.id;
      console.log(`[4. TAGS] Usando primeiro usuário disponível para criação de tags: ${tagCreationUser}`);
    } else {
      console.log(`[4. TAGS] Nenhum usuário encontrado para criação de tags. Usando ID do sistema.`);
    }
  }
  
  return tagCreationUser;
};

// Add new tags to the contact
const addNewTags = async (supabase: any, tagsToAdd: string[], contactId: string, tagCreationUser: string) => {
  let tagsAddedSuccess = 0;
  let tagsAddedFail = 0;
  const tagErrors: Array<{tag: string, error: string}> = [];
  
  for (const tag of tagsToAdd) {
    if (!tag) {
      console.log(`[4. TAGS] Tag vazia encontrada, ignorando`);
      continue;
    }
    
    // Check if tag already exists in the system
    console.log(`[4. TAGS] Processando tag: "${tag}"`);
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('name', tag)
      .maybeSingle();
    
    // Create tag if it doesn't exist
    if (!existingTag) {
      console.log(`[4. TAGS] Tag "${tag}" não encontrada no sistema. Criando...`);
      
      try {
        const { error: tagInsertError } = await supabase
          .from('tags')
          .insert({ 
            name: tag,
            created_by: tagCreationUser
          });
          
        if (tagInsertError) {
          console.error(`[4. TAGS] Erro ao criar tag "${tag}": ${tagInsertError.message} (código: ${tagInsertError.code})`);
          tagErrors.push({ tag, error: tagInsertError.message });
          tagsAddedFail++;
        } else {
          console.log(`[4. TAGS] Tag "${tag}" criada com sucesso`);
          tagsAddedSuccess++;
        }
      } catch (error: any) {
        console.error(`[4. TAGS] Exceção ao criar tag "${tag}": ${error.message}`);
        tagErrors.push({ tag, error: error.message });
        tagsAddedFail++;
      }
    } else {
      console.log(`[4. TAGS] Tag "${tag}" já existe no sistema com ID ${existingTag.id}`);
    }
    
    // Associate tag with contact
    await associateTagWithContact(supabase, tag, contactId, tagErrors);
  }
  
  return { tagsAddedSuccess, tagsAddedFail, tagErrors };
};

// Associate a tag with a contact
const associateTagWithContact = async (
  supabase: any, 
  tag: string, 
  contactId: string,
  tagErrors: Array<{tag: string, error: string}>
) => {
  try {
    console.log(`[4. TAGS] Associando tag "${tag}" ao contato ${contactId}`);
    
    const { error: tagContactError } = await supabase
      .from('contact_tags')
      .insert({
        contact_id: contactId,
        tag_name: tag
      });
    
    if (tagContactError) {
      if (tagContactError.code === '23505') { // Unique violation
        console.log(`[4. TAGS] Tag "${tag}" já associada ao contato ${contactId}`);
      } else {
        console.error(`[4. TAGS] Erro ao associar tag "${tag}" ao contato: ${tagContactError.message} (código: ${tagContactError.code})`);
        tagErrors.push({ tag, error: tagContactError.message });
      }
    } else {
      console.log(`[4. TAGS] Tag "${tag}" associada com sucesso ao contato ${contactId}`);
    }
  } catch (error: any) {
    console.error(`[4. TAGS] Exceção ao associar tag "${tag}" ao contato: ${error.message}`);
    tagErrors.push({ tag, error: error.message });
  }
};

// Remove tags from a contact
const removeTagsFromContact = async (supabase: any, tagsToRemove: string[], contactId: string) => {
  if (tagsToRemove.length > 0) {
    console.log(`[4. TAGS] Removendo ${tagsToRemove.length} tag(s) do contato ${contactId}: ${JSON.stringify(tagsToRemove)}`);
    
    const { error: removeError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .in('tag_name', tagsToRemove);
    
    if (removeError) {
      console.error(`[4. TAGS] Erro ao remover tags do contato: ${removeError.message}`);
    } else {
      console.log(`[4. TAGS] ${tagsToRemove.length} tag(s) removidas com sucesso do contato ${contactId}`);
    }
  }
};
