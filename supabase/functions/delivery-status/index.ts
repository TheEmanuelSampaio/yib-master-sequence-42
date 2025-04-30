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
    
    // Parse the request body
    const { messageId, status, attempts } = await req.json();
    
    if (!messageId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required data: messageId or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing delivery status for message ${messageId}: ${status}`);
    
    // Update message status
    const updateData = {
      status: status === 'success' ? 'sent' : 'failed',
    };
    
    // If success, add sent_at timestamp
    if (status === 'success') {
      updateData.sent_at = new Date().toISOString();
    } else {
      // If failed, increment attempts
      updateData.attempts = (attempts || 0) + 1;
      
      // If attempts >= 3, mark as persistent_error
      if (updateData.attempts >= 3) {
        updateData.status = 'persistent_error';
      }
    }
    
    // Update the scheduled message
    const { data: message, error: updateError } = await supabase
      .from('scheduled_messages')
      .update(updateData)
      .eq('id', messageId)
      .select('*, contacts(*), sequence_stages(*), sequences(*)')
      .single();
    
    if (updateError) {
      console.error('Error updating scheduled message:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update message status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Message ${messageId} status updated to ${updateData.status}`);
    
    // If message was sent successfully, update stats
    if (status === 'success') {
      // Update daily stats for the instance
      await updateDailyStats(supabase, message.sequences.instance_id, 0, 0, 1);
      
      // Update contact sequence and stage progress
      if (message.contacts && message.sequence_stages && message.sequences) {
        await handleSuccessfulDelivery(supabase, message);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Message status updated to ${updateData.status}`,
        data: message
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

// Update daily stats
async function updateDailyStats(supabase, instanceId, messagesScheduled = 0, messagesFailed = 0, messagesSent = 0) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if entry exists for today
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('date', today)
      .maybeSingle();
    
    if (existing) {
      // Update existing entry
      await supabase
        .from('daily_stats')
        .update({
          messages_scheduled: existing.messages_scheduled + messagesScheduled,
          messages_failed: existing.messages_failed + messagesFailed,
          messages_sent: existing.messages_sent + messagesSent
        })
        .eq('id', existing.id);
    } else {
      // Create new entry
      await supabase
        .from('daily_stats')
        .insert({
          instance_id: instanceId,
          date: today,
          messages_scheduled: messagesScheduled,
          messages_failed: messagesFailed,
          messages_sent: messagesSent
        });
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Handle successful message delivery
async function handleSuccessfulDelivery(supabase, message) {
  try {
    const { contacts, sequence_stages, sequences } = message;
    const contactId = contacts.id;
    const sequenceId = sequences.id;
    const stageId = sequence_stages.id;
    
    // 1. Fetch the contact_sequence record
    const { data: contactSequence, error: seqError } = await supabase
      .from('contact_sequences')
      .select('*, sequence_stages(*)')
      .eq('contact_id', contactId)
      .eq('sequence_id', sequenceId)
      .eq('status', 'active')
      .single();
    
    if (seqError || !contactSequence) {
      console.error('Error fetching contact_sequence:', seqError);
      return;
    }
    
    // 2. Update the contact_sequence with last message time
    await supabase
      .from('contact_sequences')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', contactSequence.id);
    
    // 3. Update the stage progress for this stage
    await supabase
      .from('stage_progress')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('contact_sequence_id', contactSequence.id)
      .eq('stage_id', stageId);
    
    // 4. Get all stages for this sequence sorted by order_index
    const { data: allStages, error: stagesError } = await supabase
      .from('sequence_stages')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('order_index', { ascending: true });
    
    if (stagesError || !allStages || allStages.length === 0) {
      console.error('Error fetching sequence stages:', stagesError);
      return;
    }
    
    // 5. Find current stage index and determine next stage
    const currentStageIndex = allStages.findIndex(s => s.id === stageId);
    const nextStageIndex = currentStageIndex + 1;
    
    // 6. Check if there is a next stage
    if (nextStageIndex < allStages.length) {
      // 6a. Move to next stage
      const nextStage = allStages[nextStageIndex];
      
      await supabase
        .from('contact_sequences')
        .update({
          current_stage_index: nextStageIndex,
          current_stage_id: nextStage.id
        })
        .eq('id', contactSequence.id);
      
      // 6b. Schedule next message
      await scheduleMessage(supabase, contactId, sequenceId, nextStage);
    } else {
      // 6c. Mark sequence as completed if no next stage
      await supabase
        .from('contact_sequences')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', contactSequence.id);
      
      // Update daily stats for completed sequence
      await updateDailyStats(supabase, sequences.instance_id, 0, 0, 0, 1);
    }
  } catch (error) {
    console.error('Error handling successful delivery:', error);
  }
}

// Schedule a message
async function scheduleMessage(supabase, contactId: string, sequenceId: string, stage: any) {
  try {
    let delayMinutes = stage.delay;
    
    // Convert delay to minutes
    if (stage.delay_unit === 'hours') {
      delayMinutes *= 60;
    } else if (stage.delay_unit === 'days') {
      delayMinutes *= 24 * 60;
    }
    
    // Calculate scheduled time
    const now = new Date();
    const rawScheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
    
    // Get sequence time restrictions
    const { data: restrictions, error: restrictionsError } = await supabase
      .rpc('get_sequence_time_restrictions', { seq_id: sequenceId });
    
    if (restrictionsError) {
      console.error('Error fetching time restrictions:', restrictionsError);
      // Continue without time restrictions
    }
    
    // Apply time restrictions to calculate actual scheduled time
    let scheduledTime = rawScheduledTime;
    if (restrictions && restrictions.length > 0) {
      scheduledTime = applyTimeRestrictions(rawScheduledTime, restrictions);
    }
    
    // Insert scheduled message
    const { error: scheduleError } = await supabase
      .from('scheduled_messages')
      .insert({
        contact_id: contactId,
        sequence_id: sequenceId,
        stage_id: stage.id,
        raw_scheduled_time: rawScheduledTime.toISOString(),
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending'
      });
    
    if (scheduleError) {
      console.error('Error scheduling message:', scheduleError);
      return;
    }
    
    // Update daily stats for scheduled messages
    const { data: sequence } = await supabase
      .from('sequences')
      .select('instance_id')
      .eq('id', sequenceId)
      .single();
    
    if (sequence) {
      await updateDailyStats(supabase, sequence.instance_id, 1, 0, 0);
    }
  } catch (error) {
    console.error('Error scheduling message:', error);
  }
}

// Apply time restrictions to a scheduled time
function applyTimeRestrictions(scheduledTime: Date, restrictions: any[]): Date {
  // Deep copy the date to avoid mutation
  let adjustedTime = new Date(scheduledTime.getTime());
  
  // Keep adjusting until we find a valid time
  let maxAttempts = 100; // Safety limit
  let validTime = false;
  
  while (!validTime && maxAttempts > 0) {
    validTime = true;
    
    for (const restriction of restrictions) {
      if (!restriction.active) continue;
      
      const day = adjustedTime.getDay(); // 0 = Sunday, 1 = Monday, ...
      const hour = adjustedTime.getHours();
      const minute = adjustedTime.getMinutes();
      
      // Check if current day is restricted
      if (restriction.days.includes(day)) {
        // Check if current time is within restricted hours
        const timeValue = hour * 60 + minute;
        const restrictionStart = restriction.start_hour * 60 + restriction.start_minute;
        let restrictionEnd = restriction.end_hour * 60 + restriction.end_minute;
        
        // Handle case where restriction goes into next day (e.g., 22:00 - 06:00)
        if (restrictionEnd <= restrictionStart) {
          restrictionEnd += 24 * 60; // Add 24 hours
        }
        
        if ((timeValue >= restrictionStart && timeValue <= restrictionEnd) ||
            (timeValue + 24 * 60 >= restrictionStart && timeValue + 24 * 60 <= restrictionEnd)) {
          // Time is restricted, add time until after restriction
          let hoursToAdd = Math.ceil((restrictionEnd - timeValue) / 60);
          if (hoursToAdd <= 0) hoursToAdd = 24; // Safety for edge cases
          
          adjustedTime.setHours(adjustedTime.getHours() + hoursToAdd);
          validTime = false;
          break;
        }
      }
    }
    
    maxAttempts--;
  }
  
  return adjustedTime;
}
