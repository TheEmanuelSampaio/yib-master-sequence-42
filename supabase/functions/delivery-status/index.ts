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
    const body = await req.json();
    
    if (!body || !body.messageId || !body.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required data: messageId and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messageId, status, attempts = 0 } = body;
    
    // Get the message data
    const { data: message, error: messageError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (messageError) {
      console.error('Error fetching message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message', details: messageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (status === 'success') {
      // Update message as sent
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: attempts
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error('Error updating message status to sent:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update message status', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update daily stats
      await updateDailyStats(supabase, message.sequence_id, 0, 0, 1);
      
      // Get contact sequence data
      const { data: contactSequence, error: seqError } = await supabase
        .from('contact_sequences')
        .select('*')
        .eq('contact_id', message.contact_id)
        .eq('sequence_id', message.sequence_id)
        .maybeSingle();
        
      if (seqError) {
        console.error('Error fetching contact sequence:', seqError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch contact sequence', details: seqError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (contactSequence) {
        // Update stage progress
        const { error: progressError } = await supabase
          .from('stage_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('contact_sequence_id', contactSequence.id)
          .eq('stage_id', message.stage_id);
          
        if (progressError) {
          console.error('Error updating stage progress:', progressError);
          // Continue despite error
        }
        
        // Get sequence stages to determine next stage
        const { data: stages, error: stagesError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', message.sequence_id)
          .order('order_index', { ascending: true });
          
        if (stagesError) {
          console.error('Error fetching sequence stages:', stagesError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch sequence stages', details: stagesError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Find current stage and next stage
        const currentStageIndex = stages.findIndex(s => s.id === message.stage_id);
        const nextStageIndex = currentStageIndex + 1;
        
        if (nextStageIndex < stages.length) {
          // There is a next stage, schedule it
          const nextStage = stages[nextStageIndex];
          
          // Update contact sequence to point to next stage
          const { error: updateSeqError } = await supabase
            .from('contact_sequences')
            .update({
              current_stage_index: nextStageIndex,
              current_stage_id: nextStage.id,
              last_message_at: new Date().toISOString()
            })
            .eq('id', contactSequence.id);
            
          if (updateSeqError) {
            console.error('Error updating contact sequence:', updateSeqError);
            return new Response(
              JSON.stringify({ error: 'Failed to update contact sequence', details: updateSeqError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Schedule next message
          await scheduleMessage(supabase, message.contact_id, message.sequence_id, nextStage);
        } else {
          // This was the last stage, mark sequence as completed
          const { error: completeSeqError } = await supabase
            .from('contact_sequences')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              last_message_at: new Date().toISOString()
            })
            .eq('id', contactSequence.id);
            
          if (completeSeqError) {
            console.error('Error completing contact sequence:', completeSeqError);
            return new Response(
              JSON.stringify({ error: 'Failed to complete contact sequence', details: completeSeqError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Update daily stats for completed sequence
          await updateDailyStats(supabase, null, 0, 0, 1);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message marked as sent successfully',
          messageId: messageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Handle failure
      const newAttempts = (message.attempts || 0) + 1;
      let newStatus = 'failed';
      
      // If it's the third attempt, mark as persistent error
      if (newAttempts >= 3) {
        newStatus = 'persistent_error';
      }
      
      // Update message as failed
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({
          status: newStatus,
          attempts: newAttempts
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error('Error updating message status to failed:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update message status', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update daily stats
      await updateDailyStats(supabase, null, 0, 0, 0, 1);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message marked as failed',
          messageId: messageId,
          attempts: newAttempts,
          status: newStatus
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    await updateDailyStats(supabase, null, 0, 1, 0);
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

// Update daily stats
async function updateDailyStats(supabase, sequenceId: string | null, newContacts = 0, messagesScheduled = 0, messagesSent = 0, messagesFailed = 0) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let instanceId = null;
    
    // If we have a sequence ID, get its instance ID
    if (sequenceId) {
      const { data: sequence } = await supabase
        .from('sequences')
        .select('instance_id')
        .eq('id', sequenceId)
        .single();
        
      if (sequence) {
        instanceId = sequence.instance_id;
      }
    }
    
    // If we have a specific instanceId, update just that one
    if (instanceId) {
      await updateStatsForInstance(supabase, instanceId, today, newContacts, messagesScheduled, messagesSent, messagesFailed);
    } else {
      // Otherwise, update all active instances
      const { data: instances } = await supabase
        .from('instances')
        .select('id')
        .eq('active', true);
        
      if (instances && instances.length > 0) {
        for (const instance of instances) {
          await updateStatsForInstance(supabase, instance.id, today, newContacts, messagesScheduled, messagesSent, messagesFailed);
        }
      }
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Update stats for a specific instance
async function updateStatsForInstance(supabase, instanceId: string, date: string, newContacts: number, messagesScheduled: number, messagesSent: number, messagesFailed: number) {
  // Check if entry exists for today
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('date', date)
    .maybeSingle();
    
  if (existing) {
    // Update existing entry
    await supabase
      .from('daily_stats')
      .update({
        new_contacts: existing.new_contacts + newContacts,
        messages_scheduled: existing.messages_scheduled + messagesScheduled,
        messages_sent: existing.messages_sent + messagesSent,
        messages_failed: existing.messages_failed + messagesFailed
      })
      .eq('id', existing.id);
  } else {
    // Create new entry
    await supabase
      .from('daily_stats')
      .insert({
        instance_id: instanceId,
        date,
        new_contacts: newContacts,
        messages_scheduled: messagesScheduled,
        messages_sent: messagesSent,
        messages_failed: messagesFailed
      });
  }
}
