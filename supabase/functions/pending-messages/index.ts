
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get current time
    const now = new Date().toISOString();
    
    // Get all pending messages that are scheduled to be sent now or earlier
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        contacts (*),
        sequences (*),
        sequence_stages (*),
        instances:sequences(instances(*))
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now)
      .order('scheduled_time');
    
    if (messagesError) {
      console.error('Error fetching pending messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending messages', details: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update status to 'processing' for these messages
    if (pendingMessages.length > 0) {
      const messageIds = pendingMessages.map(message => message.id);
      
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({ status: 'processing', processing_started_at: now })
        .in('id', messageIds);
      
      if (updateError) {
        console.error('Error updating message status:', updateError);
        // Continue despite error
      }
    }
    
    // Format messages for N8N
    const formattedMessages = pendingMessages.map(message => {
      const { contacts, sequences, sequence_stages, instances } = message;
      const contact = contacts;
      const sequence = sequences;
      const stage = sequence_stages;
      const instance = instances[0]; // Get the instance associated with the sequence
      
      // Get client tags for this contact
      const clientData = {
        accountId: contact.client_id,
        accountName: instance.name, // Using instance name as account name for simplicity
        contact: {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number
        },
        conversation: {
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          labels: "" // We don't have the actual labels here
        }
      };
      
      const instanceData = {
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key
      };
      
      // Determine content based on stage type
      let content = stage.content;
      
      // For typebot stages, the content is just the stage identifier
      if (stage.type === 'typebot' && stage.typebot_stage) {
        content = stage.typebot_stage;
      }
      
      const sequenceData = {
        instanceName: instance.name,
        sequenceName: sequence.name,
        type: stage.type,
        stage: {
          [`stg${sequence.current_stage_index + 1}`]: {
            id: stage.id,
            content: content,
            rawScheduledTime: message.raw_scheduled_time,
            scheduledTime: message.scheduled_time
          }
        }
      };
      
      return {
        id: message.id,
        chatwootData: clientData,
        instanceData,
        sequenceData
      };
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        messages: formattedMessages
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
