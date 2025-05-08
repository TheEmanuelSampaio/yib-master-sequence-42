
// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.com/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("[INIT] Inicializando função webhook-trigger");

// CORS headers for browser requests
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

console.log("[INIT] SUPABASE_URL definido: " + (SUPABASE_URL ? "SIM" : "NÃO"));
console.log("[INIT] SUPABASE_ANON_KEY definido: " + (SUPABASE_ANON_KEY ? "SIM" : "NÃO"));
console.log("[INIT] SUPABASE_SERVICE_ROLE_KEY definido: " + (SUPABASE_SERVICE_ROLE ? "SIM" : "NÃO"));

type WebhookPayload = {
  webhookId: string;
  accountData: {
    accountId: number;
    accountName?: string;
    adminId?: string;
  };
  contactData: {
    name: string;
    phoneNumber: string;
  };
  variables?: Record<string, string | number>;
  authToken: string;
};

// Função para processar variáveis no conteúdo
function processVariables(content: string, variables: Record<string, string | number>): string {
  let processedContent = content;
  
  console.log("[VARIÁVEIS] Processando conteúdo com variáveis:", JSON.stringify(variables));
  
  // Substituir cada variável no conteúdo
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    console.log(`[VARIÁVEIS] Substituindo ${placeholder} por ${String(value)}`);
    processedContent = processedContent.split(placeholder).join(String(value));
  });
  
  console.log("[VARIÁVEIS] Conteúdo original:", content);
  console.log("[VARIÁVEIS] Conteúdo processado:", processedContent);
  
  return processedContent;
}

serve(async (req) => {
  console.log("[REQUEST] Método: " + req.method + ", URL: " + req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método HTTP não permitido" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse request body
    console.log("[PARSE] Iniciando parse do corpo da requisição...");
    const requestData = await req.json();
    console.log("[PARSE] Body recebido:", JSON.stringify(requestData));
    
    // Validate required fields
    const { webhookId, accountData, contactData, variables, authToken } = requestData as WebhookPayload;
    
    if (!webhookId || !accountData || !accountData.accountId || !contactData || !contactData.phoneNumber || !authToken) {
      console.error("[VALIDAÇÃO] Campos obrigatórios ausentes");
      return new Response(
        JSON.stringify({ 
          error: "Campos obrigatórios ausentes",
          details: "Verifique se webhookId, accountData.accountId, contactData.phoneNumber e authToken estão presentes"
        }),
        {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    console.log("[CLIENT] Criando cliente Supabase com service role...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    console.log("[CLIENT] Cliente Supabase criado com sucesso (bypasses RLS)");

    // Validar token de autenticação - verificação ampliada similar ao tag-change
    console.log("[SEGURANÇA] Verificando token de autenticação...");
    
    // Verificar primeiro se é um token global de admin ou super_admin
    const { data: adminWithToken, error: adminAuthError } = await supabase
      .from("profiles")
      .select("id, account_name, role, auth_token")
      .eq("auth_token", authToken)
      .maybeSingle();
      
    let isGlobalToken = false;
    let tokenOwner = null;
    let creatorId = "system";
    
    if (adminWithToken) {
      console.log(`[SEGURANÇA] Token global válido pertencente a: ${adminWithToken.account_name} (${adminWithToken.role})`);
      
      // Para admins normais, verificar se eles têm acesso a este cliente específico
      if (adminWithToken.role !== 'super_admin' && accountData.adminId && accountData.adminId !== adminWithToken.id) {
        console.log(`[SEGURANÇA] adminId fornecido (${accountData.adminId}) é diferente do token owner (${adminWithToken.id}), verificando permissões`);
        
        // Admin está tentando acessar cliente de outro admin, verificar se é super_admin
        if (adminWithToken.role !== 'super_admin') {
          console.error(`[SEGURANÇA] Admin não super_admin tentando acessar cliente de outro admin`);
          
          // Registrar tentativa não autorizada
          await supabase.from("security_logs").insert({
            client_account_id: String(accountData.accountId),
            action: "webhook_trigger_admin_unauthorized_cross_access",
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
            details: { 
              error: "Admin trying to access another admin's client", 
              admin_id: adminWithToken.id,
              admin_name: adminWithToken.account_name,
              target_admin_id: accountData.adminId,
              webhook_id: webhookId
            }
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Acesso não autorizado', 
              details: 'Administradores não podem acessar clientes de outros administradores' 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Verificar se o admin tem acesso a este cliente (se não for super_admin)
      if (adminWithToken.role !== 'super_admin') {
        const { data: clientAuth, error: clientAuthError } = await supabase
          .from("clients")
          .select("id")
          .eq("account_id", accountData.accountId)
          .eq("created_by", adminWithToken.id)
          .maybeSingle();
        
        if (!clientAuth) {
          console.error(`[SEGURANÇA] Token de admin válido, mas este admin não tem acesso ao cliente com accountId=${accountData.accountId}`);
          
          // Registrar tentativa não autorizada
          await supabase.from("security_logs").insert({
            client_account_id: String(accountData.accountId),
            action: "webhook_trigger_admin_unauthorized_access",
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
            details: { 
              error: "Admin not authorized for this client", 
              account_id: accountData.accountId,
              admin_name: adminWithToken.account_name,
              webhook_id: webhookId
            }
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Acesso não autorizado', 
              details: 'O administrador não tem acesso a este cliente' 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      isGlobalToken = true;
      tokenOwner = adminWithToken;
      creatorId = adminWithToken.id;
    } else {
      // Se não for token global, verificar se é token específico de cliente
      console.log(`[SEGURANÇA] Token não é global, verificando se é token de cliente específico...`);
      
      let clientQuery = supabase.from("clients").select("id, auth_token");
      
      // Se o adminId foi fornecido, inclui-lo na busca para maior precisão
      if (accountData.adminId) {
        console.log(`[SEGURANÇA] Usando adminId=${accountData.adminId} para busca de cliente`);
        clientQuery = clientQuery
          .eq("account_id", accountData.accountId)
          .eq("created_by", accountData.adminId);
      } else {
        console.log(`[SEGURANÇA] adminId não fornecido, buscando apenas por account_id=${accountData.accountId}`);
        clientQuery = clientQuery.eq("account_id", accountData.accountId);
      }
      
      const { data: clientAuth, error: clientAuthError } = await clientQuery.maybeSingle();
      
      if (clientAuthError) {
        console.error(`[SEGURANÇA] Erro ao verificar autenticação do cliente: ${clientAuthError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao verificar autenticação', 
            details: clientAuthError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!clientAuth || clientAuth.auth_token !== authToken) {
        console.error(`[SEGURANÇA] Token inválido fornecido para o cliente com accountId=${accountData.accountId}`);
        
        // Registrar tentativa não autorizada
        await supabase.from("security_logs").insert({
          client_account_id: String(accountData.accountId),
          action: "webhook_trigger_invalid_token",
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown",
          details: { 
            error: clientAuth ? "Invalid token" : "Client not found", 
            account_id: accountData.accountId,
            admin_id: accountData.adminId,
            webhook_id: webhookId
          }
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Token de autenticação inválido', 
            details: 'O token fornecido não corresponde ao cliente especificado' 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[SEGURANÇA] Token de autenticação válido para o cliente com accountId=${accountData.accountId}`);
    }
    
    // Token válido, registrar acesso bem-sucedido
    await supabase.from("security_logs").insert({
      client_account_id: String(accountData.accountId),
      action: "webhook_trigger_authenticated_access",
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      details: { 
        webhook_id: webhookId,
        auth_method: isGlobalToken ? `global_token:${tokenOwner?.role || 'unknown'}` : 'client_token'
      }
    });
    
    console.log("[WEBHOOK] Buscando sequência com webhookId: " + webhookId);
    
    // Get all instances for this account ID
    const { data: instances, error: instancesError } = await supabase
      .from("instances")
      .select("id, client_id, name")
      .eq("active", true)
      .order("name", { ascending: true });
      
    if (instancesError || !instances || instances.length === 0) {
      console.error("[WEBHOOK] Erro ao buscar instâncias: " + instancesError?.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar instâncias ativas" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("[WEBHOOK] " + instances.length + " instâncias encontradas");
    
    // Get all clients that match the account ID
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, account_id, account_name")
      .eq("account_id", accountData.accountId);
      
    if (clientsError || !clients || clients.length === 0) {
      console.error("[WEBHOOK] Erro ao buscar clientes: " + clientsError?.message);
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado para account_id: " + accountData.accountId }),
        {
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("[WEBHOOK] " + clients.length + " cliente(s) encontrado(s)");
    
    // Get client IDs
    const clientIds = clients.map(c => c.id);
    
    // Get instances for these clients
    const filteredInstances = instances.filter(inst => clientIds.includes(inst.client_id));
    
    if (filteredInstances.length === 0) {
      console.error("[WEBHOOK] Nenhuma instância encontrada para o cliente");
      return new Response(
        JSON.stringify({ error: "Nenhuma instância encontrada para o cliente" }),
        {
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get instance IDs
    const instanceIds = filteredInstances.map(i => i.id);
    
    // Find sequence with this webhook ID
    const { data: sequences, error: sequencesError } = await supabase
      .from("sequences")
      .select(`
        id, 
        name, 
        instance_id, 
        status,
        webhook_id,
        webhook_enabled
      `)
      .in("instance_id", instanceIds)
      .eq("webhook_id", webhookId)
      .eq("webhook_enabled", true)
      .eq("status", "active");
      
    if (sequencesError) {
      console.error("[WEBHOOK] Erro ao buscar sequências: " + sequencesError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar sequências" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (!sequences || sequences.length === 0) {
      console.error("[WEBHOOK] Sequência não encontrada para webhookId: " + webhookId);
      return new Response(
        JSON.stringify({ error: "Sequência não encontrada para webhookId: " + webhookId }),
        {
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const sequence = sequences[0];
    console.log("[WEBHOOK] Sequência encontrada: " + sequence.name + " (ID: " + sequence.id + ")");
    
    // Get associated instance
    const instance = filteredInstances.find(i => i.id === sequence.instance_id);
    if (!instance) {
      console.error("[WEBHOOK] Instância não encontrada para a sequência");
      return new Response(
        JSON.stringify({ error: "Instância não encontrada para a sequência" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Find or create contact
    console.log("[WEBHOOK] Buscando ou criando contato...");
    const { phoneNumber, name } = contactData;
    
    // First check if contact exists
    const { data: existingContact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("client_id", instance.client_id)
      .maybeSingle();
      
    let contactId: string;
    
    if (contactError) {
      console.error("[WEBHOOK] Erro ao buscar contato: " + contactError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar contato" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (existingContact) {
      // Use existing contact
      contactId = existingContact.id;
      console.log("[WEBHOOK] Contato existente encontrado: " + existingContact.name + " (ID: " + existingContact.id + ")");
    } else {
      // Create new contact
      console.log("[WEBHOOK] Contato não encontrado, criando novo contato...");
      
      // Generate a unique ID for the contact
      const newContactId = crypto.randomUUID();
      
      // Insert new contact
      const { error: insertError } = await supabase
        .from("contacts")
        .insert({
          id: newContactId,
          name: name || phoneNumber, // Use name if provided, otherwise use phone number
          phone_number: phoneNumber,
          client_id: instance.client_id,
          inbox_id: 0, // Default values for webhook-created contacts
          conversation_id: 0,
          display_id: 0
        });
        
      if (insertError) {
        console.error("[WEBHOOK] Erro ao criar contato: " + insertError.message);
        return new Response(
          JSON.stringify({ error: "Erro ao criar contato" }),
          {
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      contactId = newContactId;
      console.log("[WEBHOOK] Novo contato criado com ID: " + contactId);
      
      // Increment daily stats for new contacts
      const now = new Date();
      const todayString = now.toISOString().split("T")[0];
      
      await supabase.rpc("increment_daily_stats", {
        p_instance_id: instance.instance_id,
        p_date: todayString,
        p_new_contacts: 1,
        p_messages_scheduled: 0,
        p_messages_sent: 0,
        p_messages_failed: 0,
        p_completed_sequences: 0
      });
    }
    
    // Get sequence stages
    console.log("[WEBHOOK] Buscando estágios da sequência...");
    const { data: stages, error: stagesError } = await supabase
      .from("sequence_stages")
      .select("*")
      .eq("sequence_id", sequence.id)
      .order("order_index", { ascending: true });
      
    if (stagesError || !stages || stages.length === 0) {
      console.error("[WEBHOOK] Erro ao buscar estágios: " + stagesError?.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar estágios da sequência" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("[WEBHOOK] " + stages.length + " estágios encontrados");
    
    // Check if contact is already in this sequence
    console.log("[WEBHOOK] Verificando se o contato já está na sequência...");
    const { data: existingSequence, error: existingSequenceError } = await supabase
      .from("contact_sequences")
      .select("*")
      .eq("contact_id", contactId)
      .eq("sequence_id", sequence.id)
      .in("status", ["active", "paused"])
      .maybeSingle();
      
    if (existingSequenceError) {
      console.error("[WEBHOOK] Erro ao verificar sequência existente: " + existingSequenceError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar sequência existente" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (existingSequence) {
      console.log("[WEBHOOK] Contato já está na sequência com status: " + existingSequence.status);
      return new Response(
        JSON.stringify({ 
          message: "Contato já está na sequência",
          contactId,
          sequenceId: sequence.id,
          status: existingSequence.status
        }),
        {
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Create contact_sequences record
    console.log("[WEBHOOK] Adicionando contato à sequência...");
    const contactSequenceId = crypto.randomUUID();
    
    const { error: contactSequenceError } = await supabase
      .from("contact_sequences")
      .insert({
        id: contactSequenceId,
        contact_id: contactId,
        sequence_id: sequence.id,
        current_stage_index: 0, // Start at first stage
        current_stage_id: stages[0].id,
        status: "active",
        started_at: new Date().toISOString()
      });
      
    if (contactSequenceError) {
      console.error("[WEBHOOK] Erro ao adicionar contato à sequência: " + contactSequenceError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar contato à sequência" }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Create stage progress records
    console.log("[WEBHOOK] Criando registros de progresso dos estágios...");
    const stageProgressRecords = stages.map(stage => ({
      id: crypto.randomUUID(),
      contact_sequence_id: contactSequenceId,
      stage_id: stage.id,
      status: "pending"
    }));
    
    const { error: stageProgressError } = await supabase
      .from("stage_progress")
      .insert(stageProgressRecords);
      
    if (stageProgressError) {
      console.error("[WEBHOOK] Erro ao criar registros de progresso: " + stageProgressError.message);
      // Continue anyway - not critical
    }
    
    // Schedule the first message
    console.log("[WEBHOOK] Agendando primeira mensagem...");
    const firstStage = stages[0];
    
    // Calculate delay
    const now = new Date();
    let scheduledTime = new Date(now);
    
    // Apply delay based on stage settings
    if (firstStage.delay > 0) {
      switch (firstStage.delay_unit) {
        case "minutes":
          scheduledTime.setMinutes(scheduledTime.getMinutes() + firstStage.delay);
          break;
        case "hours":
          scheduledTime.setHours(scheduledTime.getHours() + firstStage.delay);
          break;
        case "days":
          scheduledTime.setDate(scheduledTime.getDate() + firstStage.delay);
          break;
      }
    }
    
    const scheduledTimeStr = scheduledTime.toISOString();
    
    // Processar variáveis no conteúdo se houver
    let processedContent = null;
    if (variables && Object.keys(variables).length > 0 && firstStage.type === "message") {
      console.log("[WEBHOOK] Processando variáveis para a mensagem:", JSON.stringify(variables));
      processedContent = processVariables(firstStage.content, variables);
    }
    
    const { error: scheduleError } = await supabase
      .from("scheduled_messages")
      .insert({
        id: crypto.randomUUID(),
        contact_id: contactId,
        sequence_id: sequence.id,
        stage_id: firstStage.id,
        raw_scheduled_time: scheduledTimeStr,
        scheduled_time: scheduledTimeStr,
        status: "pending",
        variables: variables || {},
        processed_content: processedContent
      });
      
    if (scheduleError) {
      console.error("[WEBHOOK] Erro ao agendar mensagem: " + scheduleError.message);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao agendar mensagem",
          details: scheduleError.message
        }),
        {
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Increment daily stats for messages scheduled
    const todayString = new Date().toISOString().split("T")[0];
    
    await supabase.rpc("increment_daily_stats", {
      p_instance_id: sequence.instance_id,
      p_date: todayString,
      p_new_contacts: 0,
      p_messages_scheduled: 1,
      p_messages_sent: 0,
      p_messages_failed: 0,
      p_completed_sequences: 0
    });
    
    console.log("[WEBHOOK] Contato adicionado com sucesso à sequência!");
    return new Response(
      JSON.stringify({
        message: "Contato adicionado à sequência com sucesso",
        contactId,
        sequenceId: sequence.id,
        scheduledTime: scheduledTimeStr,
        authMethod: isGlobalToken ? `global_token:${tokenOwner?.role || 'unknown'}` : 'client_token',
        processedContent: processedContent
      }),
      {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("[ERRO] Erro não tratado:", err);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: err.message || "Erro desconhecido"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
