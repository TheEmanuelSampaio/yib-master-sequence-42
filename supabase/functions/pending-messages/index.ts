
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
    
    const now = new Date().toISOString();
    
    // Get all pending messages that are scheduled to be sent now or earlier
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('scheduled_messages')
      .select(`
        id,
        contact_id,
        sequence_id,
        stage_id,
        scheduled_time,
        raw_scheduled_time,
        attempts,
        contacts!inner(
          name,
          phone_number,
          client_id,
          inbox_id,
          conversation_id,
          display_id
        ),
        sequences!inner(
          name,
          instances!inner(
            id,
            name,
            evolution_api_url,
            api_key
          )
        ),
        sequence_stages!inner(
          name,
          type,
          content,
          typebot_stage
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(50);
    
    if (messagesError) {
      console.error('Error fetching pending messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending messages', details: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, messages: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format messages for client
    const formattedMessages = [];
    
    for (const message of pendingMessages) {
      // Mark message as processing
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({ status: 'processing' })
        .eq('id', message.id);
      
      if (updateError) {
        console.error('Error updating message status:', updateError);
        continue;
      }
      
      // Get client data
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('account_id, account_name')
        .eq('id', message.contacts.client_id)
        .limit(1)
        .single();
      
      if (clientError) {
        console.error('Error fetching client data:', clientError);
        continue;
      }
      
      // Get contact tags
      const { data: tags, error: tagsError } = await supabase
        .from('contact_tags')
        .select('tag_name')
        .eq('contact_id', message.contact_id);
      
      if (tagsError) {
        console.error('Error fetching contact tags:', tagsError);
        // Continue without tags
      }
      
      const tagsList = tags ? tags.map(t => t.tag_name).join(', ') : '';
      
      // Determine the stage key (stg1, stg2, etc.)
      const contactSequence = await getContactSequence(supabase, message.contact_id, message.sequence_id);
      const stageIndex = contactSequence ? contactSequence.current_stage_index + 1 : 1;
      const stageKey = `stg${stageIndex}`;
      
      // Format message for client
      formattedMessages.push({
        id: message.id,
        chatwootData: {
          accountData: {
            accountId: clients.account_id,
            accountName: clients.account_name
          },
          contactData: {
            id: message.contact_id,
            name: message.contacts.name,
            phoneNumber: message.contacts.phone_number
          },
          conversation: {
            inboxId: message.contacts.inbox_id,
            conversationId: message.contacts.conversation_id,
            displayId: message.contacts.display_id,
            labels: tagsList
          }
        },
        instanceData: {
          id: message.sequences.instances.id,
          name: message.sequences.instances.name,
          evolutionApiUrl: message.sequences.instances.evolution_api_url,
          apiKey: message.sequences.instances.api_key
        },
        sequenceData: {
          instanceName: message.sequences.instances.name,
          sequenceName: message.sequences.name,
          type: message.sequence_stages.type,
          stage: {
            [stageKey]: {
              id: message.stage_id,
              content: message.sequence_stages.type === 'typebot' ? message.sequence_stages.typebot_stage || stageKey : message.sequence_stages.content,
              rawScheduledTime: message.raw_scheduled_time,
              scheduledTime: message.scheduled_time
            }
          }
        }
      });
    }
    
    return new Response(
      JSON.stringify({ success: true, messages: formattedMessages }),
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

// Get contact sequence data
async function getContactSequence(supabase, contactId: string, sequenceId: string) {
  try {
    const { data, error } = await supabase
      .from('contact_sequences')
      .select('*')
      .eq('contact_id', contactId)
      .eq('sequence_id', sequenceId)
      .eq('status', 'active')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching contact sequence:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getContactSequence:', error);
    return null;
  }
}
