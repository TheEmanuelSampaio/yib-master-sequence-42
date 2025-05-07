
import { corsHeaders } from '../_shared/cors.ts';

export async function handleClient(supabase: any, accountId: any, accountName: string, creatorId: string = "system") {
  console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}"`);
  
  // Tentar como número primeiro
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', Number(accountId))
    .limit(1);
  
  if (clientError) {
    return {
      success: false,
      error: 'Erro ao buscar cliente',
      details: clientError.message,
      status: 500
    };
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
      return {
        success: false,
        error: 'Erro ao buscar cliente como string',
        details: clientErrorStr.message,
        status: 500
      };
    } else if (clientDataStr && clientDataStr.length > 0) {
      client = clientDataStr[0];
    }
  } else {
    client = clientData[0];
  }
  
  // Se ainda não encontrou o cliente, criar um novo
  if (!client) {
    console.log('[2. CLIENTE] Cliente não encontrado, criando um novo...');
    
    // Gerar um token de autenticação aleatório
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const authToken = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([
        { 
          account_id: accountId, 
          account_name: accountName, 
          created_by: creatorId,
          creator_account_name: 'Sistema (Auto)',
          auth_token: authToken
        }
      ])
      .select();
    
    if (createError) {
      console.error(`[2. CLIENTE] Erro ao criar cliente: ${JSON.stringify(createError)}`);
      return {
        success: false,
        error: 'Erro ao criar cliente',
        details: createError.message,
        status: 500
      };
    }
    
    client = newClient[0];
  } else if (!client.auth_token) {
    // Se o cliente já existe mas não tem token, gerar um
    console.log('[2. CLIENTE] Cliente encontrado mas sem token, gerando um novo...');
    
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const authToken = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({ auth_token: authToken })
      .eq('id', client.id)
      .select();
    
    if (updateError) {
      console.error(`[2. CLIENTE] Erro ao atualizar token do cliente: ${JSON.stringify(updateError)}`);
    } else if (updatedClient && updatedClient.length > 0) {
      client = updatedClient[0];
    }
  }
  
  return {
    success: true,
    client
  };
}
