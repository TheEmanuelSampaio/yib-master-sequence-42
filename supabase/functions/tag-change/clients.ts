
import { createServiceClient } from '../_shared/db.ts';

// Funções para gerenciar clientes
export const findOrCreateClient = async (accountId: string | number, accountName: string) => {
  const supabase = createServiceClient();
  console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}"`);
  
  // Tentar como número primeiro
  let { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', Number(accountId))
    .limit(1);
  
  if (clientError) {
    console.error(`[2. CLIENTE] Erro ao buscar cliente:`, clientError);
    throw clientError;
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
      console.error(`[2. CLIENTE] Erro ao buscar cliente como string:`, clientErrorStr);
      throw clientErrorStr;
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
      console.error(`[2. CLIENTE] Erro ao criar cliente:`, createError);
      throw createError;
    }
    
    client = newClient[0];
    console.log(`[2. CLIENTE] Novo cliente criado: id=${client.id}, accountName=${client.account_name}`);
  }
  
  console.log(`[2. CLIENTE] Cliente encontrado: id=${client.id}, accountName=${client.account_name}, createdBy=${client.created_by}`);
  return client;
};
