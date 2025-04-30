
import { corsHeaders } from '../_shared/cors.ts';

export async function handleContact(
  supabase: any, 
  contactId: any, 
  contactName: string, 
  phoneNumber: string, 
  client: any,
  conversationId: number,
  displayId: number,
  inboxId: number
) {
  // Verificar se já existe um contato para esse número e account_id
  const { data: existingContacts, error: contactQueryError } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('client_id', client.id);
  
  if (contactQueryError) {
    return {
      success: false,
      error: 'Erro ao buscar contato',
      details: contactQueryError.message,
      status: 500
    };
  }
  
  let contact = null;
  
  // Criar ou atualizar contato
  if (!existingContacts || existingContacts.length === 0) {
    const contactUniqueId = `${client.id}:${String(contactId)}`;
    console.log(`[3. CONTATO] Criando novo contato: ${contactUniqueId}`);
    
    const { data: newContact, error: createContactError } = await supabase
      .from('contacts')
      .insert([
        {
          id: contactUniqueId, // ID único combinando cliente e ID do contato
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
      return {
        success: false,
        error: 'Erro ao criar contato',
        details: createContactError.message,
        status: 500
      };
    }
    
    contact = newContact[0];
    
    // Increment daily stats for new contact
    try {
      await supabase.rpc('increment_daily_stats', { 
        instance_id: null, 
        stat_date: new Date().toISOString().split('T')[0],
        new_contacts: 1 
      });
    } catch (statsError) {
      console.error(`[ESTATÍSTICAS] Erro ao incrementar estatísticas: ${JSON.stringify(statsError)}`);
    }
  } else {
    contact = existingContacts[0];
    console.log(`[3. CONTATO] Contato existente encontrado: ${contact.id}`);
    
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
      return {
        success: false,
        error: 'Erro ao atualizar contato',
        details: updateContactError.message,
        status: 500
      };
    }
  }
  
  return {
    success: true,
    contact
  };
}
