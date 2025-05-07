
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
    adminId?: string;
  };
  contactData: {
    name: string;
    phoneNumber: string;
  };
  variables?: Record<string, string | number>;
  authToken: string;
};

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

    // Create Supabase client with service role to bypass RLS
    console.log("[CLIENT] Criando cliente Supabase...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    console.log("[CLIENT] Cliente Supabase criado com sucesso");

    // Authenticate with token
    console.log("[SEGURANÇA] Verificando token de autenticação...");
    
    // Importante: Usar o service role para verificar o token
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, account_name, role")
      .eq("auth_token", authToken)
      .maybeSingle();
      
    if (profileError || !profileData) {
      console.error("[SEGURANÇA] Falha na autenticação: " + (profileError?.message || "Token inválido"));
      
      // Check if token is a client token
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, account_name")
        .eq("auth_token", authToken)
        .maybeSingle();
        
      if (clientError || !clientData) {
        console.error("[SEGURANÇA] Falha na autenticação de cliente: " + (clientError?.message || "Token inválido"));
        console.log("[DEBUG] Auth token recebido: " + authToken);
        
        // Log todos os tokens de usuários para debug (remover em produção)
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from("profiles")
          .select("id, auth_token")
          .limit(5);
          
        if (!allProfilesError && allProfiles) {
          console.log("[DEBUG] Exemplos de tokens de perfis:");
          allProfiles.forEach((p, idx) => {
            if (p.auth_token) {
              console.log(`[DEBUG] Perfil ${idx + 1}: ${p.auth_token.substring(0, 10)}...`);
            } else {
              console.log(`[DEBUG] Perfil ${idx + 1}: sem token`);
            }
          });
        }
        
        return new Response(
          JSON.stringify({ error: "Autenticação falhou. Token inválido." }),
          {
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("[SEGURANÇA] Autenticação realizada para cliente: " + clientData.account_name);
    } else {
      console.log("[SEGURANÇA] Autenticação realizada para " + profileData.account_name + " (" + profileData.role + ")");
    }
    
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
        type,
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
        variables: variables || {}
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
        scheduledTime: scheduledTimeStr
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
