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
    const { messageId, status } = await req.json();
    
    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'Missing messageId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the message
    const { data: message, error: messageError } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        contacts (*),
        sequences (*),
        sequence_stages (*)
      `)
      .eq('id', messageId)
      .single();
    
    if (messageError) {
      console.error('Error fetching message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message', details: messageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const now = new Date().toISOString();
    
    if (status === 'success') {
      // Mark message as sent
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({
          status: 'sent',
          sent_at: now,
          delivery_attempts: message.delivery_attempts + 1,
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error('Error updating message status:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update message status', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update contact_sequence to move to next stage
      const contactSequenceId = message.contact_sequence_id;
      const currentStageIndex = message.sequences.current_stage_index;
      
      // Get all stages for this sequence
      const { data: stages, error: stagesError } = await supabase
        .from('sequence_stages')
        .select('*')
        .eq('sequence_id', message.sequence_id)
        .order('order_index');
      
      if (stagesError) {
        console.error('Error fetching stages:', stagesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch stages', details: stagesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update stage progress
      const { error: progressError } = await supabase
        .from('stage_progress')
        .update({
          status: 'completed',
          completed_at: now
        })
        .eq('contact_sequence_id', contactSequenceId)
        .eq('stage_id', message.stage_id);
      
      if (progressError) {
        console.error('Error updating stage progress:', progressError);
        // Continue despite error
      }
      
      // Check if there's a next stage
      const nextStageIndex = currentStageIndex + 1;
      if (nextStageIndex < stages.length) {
        const nextStage = stages[nextStageIndex];
        
        // Update contact sequence to point to next stage
        const { error: updateSeqError } = await supabase
          .from('contact_sequences')
          .update({
            current_stage_index: nextStageIndex,
            current_stage_id: nextStage.id,
            updated_at: now
          })
          .eq('id', contactSequenceId);
        
        if (updateSeqError) {
          console.error('Error updating contact sequence:', updateSeqError);
          return new Response(
            JSON.stringify({ error: 'Failed to update contact sequence', details: updateSeqError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Schedule the next message
        await scheduleNextMessage(supabase, message.contact_id, message.sequence_id, nextStage);
      } else {
        // This was the last stage, mark sequence as completed
        const { error: completeError } = await supabase
          .from('contact_sequences')
          .update({
            status: 'completed',
            completed_at: now,
            updated_at: now
          })
          .eq('id', contactSequenceId);
        
        if (completeError) {
          console.error('Error completing sequence:', completeError);
          return new Response(
            JSON.stringify({ error: 'Failed to complete sequence', details: completeError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Update daily stats for completed sequences
        await updateDailyStats(supabase, message.sequences.instance_id, 0, 0, 1);
      }
    } else {
      // Message delivery failed
      const deliveryAttempts = message.delivery_attempts + 1;
      const status = deliveryAttempts >= 3 ? 'persistent_error' : 'failed';
      
      // Update message status
      const { error: updateError } = await supabase
        .from('scheduled_messages')
        .update({
          status: status,
          delivery_attempts: deliveryAttempts,
          last_error: 'Delivery failed',
          updated_at: now
        })
        .eq('id', messageId);
      
      if (updateError) {
        console.error('Error updating message status:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update message status', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
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

// Schedule the next message in a sequence
async function scheduleNextMessage(supabase, contactId: string, sequenceId: string, stage: any) {
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
    
    // Get the contact sequence for this contact and sequence
    const { data: contactSequence, error: contactSeqError } = await supabase
      .from('contact_sequences')
      .select('id')
      .eq('contact_id', contactId)
      .eq('sequence_id', sequenceId)
      .eq('status', 'active')
      .single();
    
    if (contactSeqError) {
      console.error('Error getting contact sequence:', contactSeqError);
      return;
    }
    
    // Insert scheduled message
    const { error: scheduleError } = await supabase
      .from('scheduled_messages')
      .insert({
        contact_id: contactId,
        sequence_id: sequenceId,
        stage_id: stage.id,
        contact_sequence_id: contactSequence.id,
        raw_scheduled_time: rawScheduledTime.toISOString(),
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending',
        delivery_attempts: 0
      });
    
    if (scheduleError) {
      console.error('Error scheduling message:', scheduleError);
      return;
    }
    
    // Update daily stats for scheduled messages
    await updateDailyStats(supabase, null, 0, 1, 0);
    
    // Update stage progress
    const { error: progressError } = await supabase
      .from('stage_progress')
      .update({ status: 'pending' })
      .eq('contact_sequence_id', contactSequence.id)
      .eq('stage_id', stage.id);
    
    if (progressError) {
      console.error('Error updating stage progress:', progressError);
      // Continue despite error
    }
  } catch (error) {
    console.error('Error scheduling next message:', error);
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
        
        // Handle case where restriction goes into next day
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
async function updateDailyStats(supabase, instanceId: string | null, newContacts = 0, messagesScheduled = 0, completedSequences = 0) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // If instanceId is null, update stats for all instances
    if (instanceId === null) {
      if (newContacts > 0 || messagesScheduled > 0 || completedSequences > 0) {
        const { data: instances } = await supabase
          .from('instances')
          .select('id')
          .eq('active', true);
        
        if (instances && instances.length > 0) {
          for (const instance of instances) {
            await updateStatsForInstance(supabase, instance.id, today, newContacts, messagesScheduled, completedSequences);
          }
        }
      }
    } else {
      // Update stats for specific instance
      await updateStatsForInstance(supabase, instanceId, today, newContacts, messagesScheduled, completedSequences);
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Update stats for a specific instance
async function updateStatsForInstance(supabase, instanceId: string, date: string, newContacts: number, messagesScheduled: number, completedSequences: number) {
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
        completed_sequences: existing.completed_sequences + completedSequences
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
        completed_sequences: completedSequences
      });
  }
}
