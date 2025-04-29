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
        JSON.stringify({ error: 'Missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the message
    const { data: message, error: messageError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', messageId)
      .limit(1)
      .single();
    
    if (messageError) {
      console.error('Error fetching message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message', details: messageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {};
    
    if (status === 'success') {
      updateData.status = 'sent';
      updateData.sent_at = now;
      
      // Update daily stats for sent messages
      await updateStats(supabase, message, 'sent');
      
      // Move to next stage or complete sequence
      await advanceSequence(supabase, message);
    } else {
      const attemptsCount = attempts || message.attempts + 1;
      
      if (attemptsCount >= 3) {
        updateData.status = 'persistent_error';
        updateData.attempts = attemptsCount;
        
        // Update daily stats for failed messages
        await updateStats(supabase, message, 'failed');
      } else {
        updateData.status = 'failed';
        updateData.attempts = attemptsCount;
      }
    }
    
    // Update the message
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update(updateData)
      .eq('id', messageId);
    
    if (updateError) {
      console.error('Error updating message:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update message', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

// Update daily stats
async function updateStats(supabase, message, status) {
  try {
    const { data: sequence } = await supabase
      .from('sequences')
      .select('instance_id')
      .eq('id', message.sequence_id)
      .limit(1)
      .single();
    
    if (!sequence) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if entry exists for today
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('instance_id', sequence.instance_id)
      .eq('date', today)
      .maybeSingle();
    
    const messagesSent = status === 'sent' ? 1 : 0;
    const messagesFailed = status === 'failed' ? 1 : 0;
    
    if (existing) {
      // Update existing entry
      await supabase
        .from('daily_stats')
        .update({
          messages_sent: existing.messages_sent + messagesSent,
          messages_failed: existing.messages_failed + messagesFailed
        })
        .eq('id', existing.id);
    } else {
      // Create new entry
      await supabase
        .from('daily_stats')
        .insert({
          instance_id: sequence.instance_id,
          date: today,
          messages_sent: messagesSent,
          messages_failed: messagesFailed
        });
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Advance sequence to next stage or complete
async function advanceSequence(supabase, message) {
  try {
    // Get the contact sequence
    const { data: contactSequence, error: seqError } = await supabase
      .from('contact_sequences')
      .select('*')
      .eq('contact_id', message.contact_id)
      .eq('sequence_id', message.sequence_id)
      .eq('status', 'active')
      .limit(1)
      .single();
    
    if (seqError) {
      console.error('Error fetching contact sequence:', seqError);
      return;
    }
    
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
      return;
    }
    
    // Get all stages for the sequence
    const { data: stages, error: stagesError } = await supabase
      .from('sequence_stages')
      .select('*')
      .eq('sequence_id', message.sequence_id)
      .order('order_index', { ascending: true });
    
    if (stagesError) {
      console.error('Error fetching sequence stages:', stagesError);
      return;
    }
    
    // Find current stage and next stage
    const currentStageIndex = stages.findIndex(stage => stage.id === message.stage_id);
    
    if (currentStageIndex === -1) {
      console.error('Current stage not found in sequence');
      return;
    }
    
    // Update contact sequence with last message time
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString()
    };
    
    // Check if there's a next stage
    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1];
      
      // Update contact sequence with next stage
      updateData.current_stage_index = currentStageIndex + 1;
      updateData.current_stage_id = nextStage.id;
      
      // Schedule the next message
      await scheduleMessage(supabase, message.contact_id, message.sequence_id, nextStage);
    } else {
      // This was the last stage, complete the sequence
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      
      // Update daily stats for completed sequences
      await updateCompletedSequenceStats(supabase, message.sequence_id);
    }
    
    // Update contact sequence
    const { error: updateError } = await supabase
      .from('contact_sequences')
      .update(updateData)
      .eq('id', contactSequence.id);
    
    if (updateError) {
      console.error('Error updating contact sequence:', updateError);
    }
  } catch (error) {
    console.error('Error in advanceSequence:', error);
  }
}

// Schedule next message
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
      .limit(1)
      .single();
    
    if (sequence) {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if entry exists for today
      const { data: existing } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('instance_id', sequence.instance_id)
        .eq('date', today)
        .maybeSingle();
      
      if (existing) {
        // Update existing entry
        await supabase
          .from('daily_stats')
          .update({
            messages_scheduled: existing.messages_scheduled + 1
          })
          .eq('id', existing.id);
      } else {
        // Create new entry
        await supabase
          .from('daily_stats')
          .insert({
            instance_id: sequence.instance_id,
            date: today,
            messages_scheduled: 1
          });
      }
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

// Update daily stats for completed sequences
async function updateCompletedSequenceStats(supabase, sequenceId: string) {
  try {
    const { data: sequence } = await supabase
      .from('sequences')
      .select('instance_id')
      .eq('id', sequenceId)
      .limit(1)
      .single();
    
    if (!sequence) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if entry exists for today
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('instance_id', sequence.instance_id)
      .eq('date', today)
      .maybeSingle();
    
    if (existing) {
      // Update existing entry
      await supabase
        .from('daily_stats')
        .update({
          completed_sequences: existing.completed_sequences + 1
        })
        .eq('id', existing.id);
    } else {
      // Create new entry
      await supabase
        .from('daily_stats')
        .insert({
          instance_id: sequence.instance_id,
          date: today,
          completed_sequences: 1
        });
    }
  } catch (error) {
    console.error('Error updating completed sequence stats:', error);
  }
}
