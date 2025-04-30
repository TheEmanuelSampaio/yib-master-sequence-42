
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
    
    // Get pending messages that are scheduled for now or earlier
    const { data: pendingMessages, error: pendingError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(10); // Limit to avoid processing too many at once
    
    if (pendingError) {
      console.error('Error fetching pending messages:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending messages', details: pendingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending messages to process', data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Mark these messages as processing
    const messageIds = pendingMessages.map(msg => msg.id);
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update({ status: 'processing' })
      .in('id', messageIds);
    
    if (updateError) {
      console.error('Error updating message status to processing:', updateError);
      // Continue anyway to try to deliver the messages
    }
    
    // Process each message
    const processedMessages = [];
    
    for (const message of pendingMessages) {
      // Get contact data
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', message.contact_id)
        .single();
        
      if (contactError) {
        console.error(`Error fetching contact ${message.contact_id}:`, contactError);
        continue;
      }
      
      // Get contact tags
      const { data: contactTags, error: tagsError } = await supabase
        .from('contact_tags')
        .select('tag_name')
        .eq('contact_id', message.contact_id);
        
      if (tagsError) {
        console.error(`Error fetching tags for contact ${message.contact_id}:`, tagsError);
        continue;
      }
      
      const tags = contactTags.map(ct => ct.tag_name).join(', ');
      
      // Get sequence data
      const { data: sequence, error: sequenceError } = await supabase
        .from('sequences')
        .select('name, instance_id')
        .eq('id', message.sequence_id)
        .single();
        
      if (sequenceError) {
        console.error(`Error fetching sequence ${message.sequence_id}:`, sequenceError);
        continue;
      }
      
      // Get instance data
      const { data: instance, error: instanceError } = await supabase
        .from('instances')
        .select('name, evolution_api_url, api_key')
        .eq('id', sequence.instance_id)
        .single();
        
      if (instanceError) {
        console.error(`Error fetching instance ${sequence.instance_id}:`, instanceError);
        continue;
      }
      
      // Get stage data
      const { data: stage, error: stageError } = await supabase
        .from('sequence_stages')
        .select('*')
        .eq('id', message.stage_id)
        .single();
        
      if (stageError) {
        console.error(`Error fetching stage ${message.stage_id}:`, stageError);
        continue;
      }
      
      // Prepare response payload with all necessary data
      const processedMessage = {
        id: message.id,
        chatwootData: {
          accountData: {
            accountId: contact.client_id, // Using client_id as account_id
            accountName: instance.name, // Using instance name as account name
          },
          contactData: {
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phone_number,
          },
          conversation: {
            inboxId: contact.inbox_id,
            conversationId: contact.conversation_id,
            displayId: contact.display_id,
            labels: tags,
          },
        },
        instanceData: {
          id: sequence.instance_id,
          name: instance.name,
          evolutionApiUrl: instance.evolution_api_url,
          apiKey: instance.api_key,
        },
        sequenceData: {
          instanceName: instance.name,
          sequenceName: sequence.name,
          type: stage.type,
          stage: {
            [`stg${stage.order_index+1}`]: {
              id: stage.id,
              content: stage.type === 'typebot' ? `stg${stage.order_index+1}` : stage.content,
              rawScheduledTime: message.raw_scheduled_time,
              scheduledTime: message.scheduled_time,
            }
          }
        }
      };
      
      processedMessages.push(processedMessage);
    }
    
    return new Response(
      JSON.stringify({
        message: `Processed ${processedMessages.length} pending messages`,
        data: processedMessages
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
