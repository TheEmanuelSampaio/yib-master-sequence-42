
import { corsHeaders } from '../_shared/cors.ts';

export async function handleClient(supabase: any, accountId: any, accountName: string, creatorId: string = "system", adminId?: string) {
  console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}", adminId=${adminId || 'não informado'}`);
  
  let query = supabase
    .from('clients')
    .select('*');
    
  // Se o adminId foi fornecido, filtrar por ele também
  if (adminId) {
    query = query.eq('created_by', adminId);
  }
    
  // Tentar como número primeiro
  const { data: clientData, error: clientError } = await query
    .eq('account_id', Number(accountId))
    .order('created_at', { ascending: false })
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
    let stringQuery = supabase
      .from('clients')
      .select('*');
      
    // Se o adminId foi fornecido, filtrar por ele também
    if (adminId) {
      stringQuery = stringQuery.eq('created_by', adminId);
    }
      
    const { data: clientDataStr, error: clientErrorStr } = await stringQuery
      .eq('account_id', String(accountId))
      .order('created_at', { ascending: false })
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
    
    // Verificar se creatorId foi fornecido (não usar system se adminId foi fornecido)
    const effectiveCreatorId = adminId || creatorId;
    
    // Gerar um token de autenticação aleatório
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const authToken = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Buscar o nome da conta do criador se for um ID fornecido
    let creatorAccountName = 'Sistema (Auto)';
    if (effectiveCreatorId !== 'system') {
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('account_name')
        .eq('id', effectiveCreatorId)
        .single();
        
      if (creatorData) {
        creatorAccountName = creatorData.account_name;
      }
    }
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([
        { 
          account_id: accountId, 
          account_name: accountName, 
          created_by: effectiveCreatorId,
          creator_account_name: creatorAccountName,
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
