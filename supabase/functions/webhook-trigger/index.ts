
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook path parameters from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    // The webhook ID is the last segment of the URL path
    const webhookId = pathParts[pathParts.length - 1];
    
    // Get request body
    const requestData = await req.json();
    
    console.log("Webhook trigger received:", {
      method: req.method,
      url: req.url,
      webhookId,
      requestData
    });

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verificar qual sequência corresponde a este webhook_id
    console.log("Finding sequence with webhook_id:", webhookId);
    
    const { data: sequenceData, error: sequenceError } = await supabase
      .from("sequences")
      .select(`
        id, 
        name, 
        instance_id,
        webhooks:webhook_id,
        instances:instance_id (
          id,
          client_id
        )
      `)
      .eq("webhook_id", webhookId)
      .eq("webhook_enabled", true)
      .eq("status", "active")
      .single();
    
    if (sequenceError) {
      console.error("Error finding sequence:", sequenceError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao encontrar sequência: ${sequenceError.message}`,
          details: {
            message: "Verifique se o ID do webhook está correto e se a sequência está ativa",
            webhook_id: webhookId
          }
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!sequenceData) {
      console.error("No active sequence found with webhook ID:", webhookId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sequência não encontrada ou inativa",
          details: {
            message: "Nenhuma sequência ativa encontrada com este webhook_id",
            webhook_id: webhookId
          }
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Found sequence:", {
      id: sequenceData.id,
      name: sequenceData.name,
      webhook_id: webhookId,
      instance_id: sequenceData.instance_id,
      client_id: sequenceData.instances?.client_id
    });

    // 2. Verificar se o número de telefone está presente e é válido
    const phoneNumber = requestData.phoneNumber || requestData.phone || requestData.phone_number;
    
    if (!phoneNumber) {
      console.error("Phone number missing in request");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Número de telefone não fornecido",
          details: {
            message: "O campo 'phoneNumber', 'phone' ou 'phone_number' é obrigatório",
            required_params: ["phoneNumber|phone|phone_number"]
          }
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Format phone number (remove non-digits)
    const formattedPhone = String(phoneNumber).replace(/\D/g, "");
    console.log("Using phone number:", formattedPhone);

    // 3. Verificar se o cliente_id da instância corresponde a algum contato com este número
    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("phone_number", formattedPhone)
      .eq("client_id", sequenceData.instances?.client_id)
      .single();

    if (contactError && contactError.code !== "PGRST116") {
      console.error("Error finding contact:", contactError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao buscar contato: ${contactError.message}`,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Se o contato não existir, criar um novo
    let contact = contactData;
    
    if (!contactData) {
      console.log("Contact not found, creating new contact");
      // Extrair nome do corpo da requisição
      const contactName = requestData.name || requestData.contactName || formattedPhone;
      
      // Criar um novo contato
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert({
          name: contactName,
          phone_number: formattedPhone,
          client_id: sequenceData.instances?.client_id,
          // Defaults que podem ser substituídos depois
          inbox_id: 0,
          conversation_id: 0,
          display_id: Math.floor(Math.random() * 100000)
        })
        .select("*")
        .single();
      
      if (createError) {
        console.error("Error creating contact:", createError);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erro ao criar contato: ${createError.message}`,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      contact = newContact;
      console.log("New contact created:", contact);
    } else {
      console.log("Contact found:", contact);
    }
    
    // 4. Chamar a função de tag-change para adicionar o contato à sequência
    console.log("Calling tag-change function to add contact to sequence");
    // Extract any variables from the request body
    const variables = { ...requestData };
    delete variables.phoneNumber;
    delete variables.phone;
    delete variables.phone_number;
    delete variables.name;
    delete variables.contactName;

    const tagChangeResponse = await fetch(
      `${supabaseUrl}/functions/v1/tag-change`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          contactId: contact.id,
          clientId: sequenceData.instances?.client_id,
          tags: [webhookId], // Usar o webhook_id como tag para disparar a sequência específica
          variables: variables, // Passar outras variáveis do corpo para a função de tag-change
        }),
      }
    );
    
    const tagChangeResult = await tagChangeResponse.json();
    console.log("Tag change result:", tagChangeResult);
    
    if (!tagChangeResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao adicionar contato à sequência",
          details: tagChangeResult.error || "Erro desconhecido",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // 5. Retornar resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: "Contato adicionado à sequência com sucesso",
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone_number,
        },
        sequence: {
          id: sequenceData.id,
          name: sequenceData.name,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
    
  } catch (error) {
    console.error("Webhook trigger error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erro interno: ${error.message}`,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
