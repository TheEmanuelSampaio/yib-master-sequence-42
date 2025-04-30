
import { logQueryError } from '../_shared/db-helpers.ts';

// Find or create a client for the Chatwoot account
export const findOrCreateClient = async (supabase: any, accountId: number, accountName: string) => {
  console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}"`);
  
  let { data: existingClient, error: clientError } = await supabase
    .from('clients')
    .select('id, account_name, created_by')
    .eq('account_id', accountId)
    .maybeSingle();

  if (clientError) {
    logQueryError('2. CLIENTE', clientError);
  }

  if (!existingClient) {
    // Create client if it doesn't exist
    console.log(`[2. CLIENTE] Cliente não encontrado para accountId=${accountId}. Criando novo cliente...`);
    
    const { data: createdClient, error: createError } = await supabase
      .from('clients')
      .insert({
        account_id: accountId,
        account_name: accountName,
        created_by: '00000000-0000-0000-0000-000000000000', // System
        creator_account_name: 'Sistema'
      })
      .select('id, account_name, created_by')
      .single();

    if (createError) {
      console.error(`[2. CLIENTE] Erro ao criar cliente: ${createError.message}`);
      throw createError;
    }

    existingClient = createdClient;
    console.log(`[2. CLIENTE] Cliente criado com sucesso: id=${existingClient.id}, accountName=${existingClient.account_name}, createdBy=${existingClient.created_by}`);
  } else {
    console.log(`[2. CLIENTE] Cliente encontrado: id=${existingClient.id}, accountName=${existingClient.account_name}, createdBy=${existingClient.created_by}`);
  }

  return existingClient;
};
