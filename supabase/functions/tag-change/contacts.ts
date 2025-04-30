
import { logQueryError } from '../_shared/db-helpers.ts';

// Find or create a contact
export const findOrCreateContact = async (
  supabase: any,
  contactId: string | number, 
  name: string, 
  phoneNumber: string,
  inboxId: number,
  conversationId: number,
  displayId: number,
  clientId: string
) => {
  console.log(`[3. CONTATO] Verificando existência do contato id=${contactId}`);
  const contactIdStr = contactId.toString();
  
  const { data: existingContact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactIdStr)
    .maybeSingle();

  if (contactError) {
    logQueryError('3. CONTATO', contactError);
  }

  if (!existingContact) {
    // Create contact
    console.log(`[3. CONTATO] Contato id=${contactId} não encontrado. Criando novo contato...`);
    
    const { data: newContact, error: createContactError } = await supabase
      .from('contacts')
      .insert({
        id: contactIdStr,
        name,
        phone_number: phoneNumber,
        inbox_id: inboxId,
        conversation_id: conversationId,
        display_id: displayId,
        client_id: clientId
      })
      .select('id')
      .single();

    if (createContactError) {
      console.error(`[3. CONTATO] Erro ao criar contato: ${createContactError.message}`);
      throw createContactError;
    }

    console.log(`[3. CONTATO] Contato criado com sucesso: id=${contactId}`);
    await updateStatisticsForNewContact(supabase, clientId);
    
    return { isNew: true, contactData: newContact };
  } else {
    // Update contact if needed
    console.log(`[3. CONTATO] Contato id=${contactId} encontrado. Atualizando dados...`);
    
    const { data: updatedContact, error: updateContactError } = await supabase
      .from('contacts')
      .update({
        name,
        phone_number: phoneNumber,
        inbox_id: inboxId,
        conversation_id: conversationId,
        display_id: displayId
      })
      .eq('id', contactIdStr)
      .select('id')
      .single();

    if (updateContactError) {
      console.error(`[3. CONTATO] Erro ao atualizar contato: ${updateContactError.message}`);
      throw updateContactError;
    }

    console.log(`[3. CONTATO] Contato atualizado com sucesso: id=${contactId}`);
    
    return { isNew: false, contactData: existingContact };
  }
};

// Update statistics for a new contact
const updateStatisticsForNewContact = async (supabase: any, clientId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch all instances for the client
  const { data: instances } = await supabase
    .from('instances')
    .select('id')
    .eq('client_id', clientId);
    
  if (instances && instances.length > 0) {
    console.log(`[3. CONTATO] Atualizando estatísticas para ${instances.length} instância(s)`);
    for (const instance of instances) {
      const { error: statsError } = await supabase.rpc('increment_daily_stats', {
        instance_id: instance.id,
        stat_date: today,
        completed_seqs: 0,
        msgs_sent: 0,
        msgs_failed: 0,
        msgs_scheduled: 0,
        new_contacts: 1
      });
      
      if (statsError) {
        console.error(`[3. CONTATO] Erro ao atualizar estatísticas para instância ${instance.id}: ${statsError.message}`);
      } else {
        console.log(`[3. CONTATO] Estatísticas atualizadas para instância ${instance.id}`);
      }
    }
  } else {
    console.log(`[3. CONTATO] Nenhuma instância encontrada para atualizar estatísticas`);
  }
};
