
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
    
    // Obter ID válido de um usuário existente ou usar um UUID gerado
    let validCreatorId;
    
    if (creatorId === "system") {
      // Buscar um usuário admin ou super_admin para usar como criador
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (adminError || !adminUser || adminUser.length === 0) {
        // Se não encontrar, gerar um UUID válido
        validCreatorId = crypto.randomUUID();
        console.log(`[2. CLIENTE] Usando UUID gerado: ${validCreatorId}`);
      } else {
        validCreatorId = adminUser[0].id;
        console.log(`[2. CLIENTE] Usando ID de usuário existente: ${validCreatorId}`);
      }
    } else {
      validCreatorId = creatorId;
    }
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([
        { 
          account_id: accountId, 
          account_name: accountName, 
          created_by: validCreatorId,
          creator_account_name: 'Sistema (Auto)'
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
  }
  
  return {
    success: true,
    client
  };
}
