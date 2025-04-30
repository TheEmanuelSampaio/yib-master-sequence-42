
import { createServiceClient } from '../_shared/db.ts';

// Funções para gerenciar contatos
export const findOrCreateContact = async (
  clientId: string,
  contactId: string | number,
  contactName: string,
  phoneNumber: string,
  conversationId: number,
  displayId: number,
  inboxId: number
) => {
  const supabase = createServiceClient();
  
  const uniqueContactId = `${clientId}:${String(contactId)}`;
  console.log(`[3. CONTATO] Verificando existência do contato id=${uniqueContactId}`);
  
  // Verificar se já existe um contato para esse número e account_id
  const { data: existingContacts, error: contactQueryError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', uniqueContactId);
  
  if (contactQueryError) {
    console.error(`[3. CONTATO] Erro ao buscar contato:`, contactQueryError);
    throw contactQueryError;
  }
  
  let contact = null;
  
  // Criar ou atualizar contato
  if (!existingContacts || existingContacts.length === 0) {
    const { data: newContact, error: createContactError } = await supabase
      .from('contacts')
      .insert([
        {
          id: uniqueContactId,
          client_id: clientId,
          name: contactName,
          phone_number: phoneNumber,
          conversation_id: conversationId,
          display_id: displayId,
          inbox_id: inboxId
        }
      ])
      .select();
    
    if (createContactError) {
      console.error(`[3. CONTATO] Erro ao criar contato:`, createContactError);
      throw createContactError;
    }
    
    contact = newContact[0];
    console.log(`[3. CONTATO] Novo contato criado: id=${contact.id}, name=${contact.name}`);
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
      .eq('id', uniqueContactId);
    
    if (updateContactError) {
      console.error(`[3. CONTATO] Erro ao atualizar contato:`, updateContactError);
      throw updateContactError;
    }
    
    console.log(`[3. CONTATO] Contato id=${contact.id} encontrado. Atualizando dados...`);
  }
  
  console.log(`[3. CONTATO] Contato atualizado com sucesso: id=${contact.id}`);
  return contact;
};

export const getContactTags = async (contactId: string) => {
  const supabase = createServiceClient();
  
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
  
  return currentTags;
};
