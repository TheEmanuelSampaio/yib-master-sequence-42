
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
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    // Check if data is wrapped in a data object or directly in the body
    const data = requestBody.data || requestBody;
    
    if (!data || !data.accountId || !data.accountName || !data.contact || !data.conversation) {
      console.error('Missing required data:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountId, accountName } = data;
    const { id: contactId, name: contactName, phoneNumber } = data.contact;
    const { inboxId, conversationId, displayId, labels } = data.conversation;
    
    console.log(`Processing contact ${contactName} with labels: ${labels}`);
    console.log(`Looking for client with account_id: ${accountId}`);
    
    // First, try to query by account_id
    const { data: clientsByAccountId, error: accountIdError } = await supabase
      .from('clients')
      .select('*, profiles:created_by(*)')
      .eq('account_id', accountId)
      .limit(1);
    
    console.log('Query by account_id results:', JSON.stringify(clientsByAccountId || [], null, 2));
    console.log('Query by account_id error:', accountIdError?.message || 'No error');

    // If not found by account_id, try by id
    let clients = clientsByAccountId;
    if (!clients || clients.length === 0) {
      console.log(`No client found with account_id ${accountId}, trying with id...`);
      const { data: clientsById, error: idError } = await supabase
        .from('clients')
        .select('*, profiles:created_by(*)')
        .eq('id', accountId)
        .limit(1);
      
      console.log('Query by id results:', JSON.stringify(clientsById || [], null, 2));
      console.log('Query by id error:', idError?.message || 'No error');
      
      clients = clientsById;
    }

    // Final check if client was found
    if (!clients || clients.length === 0) {
      console.error(`No client found with account_id or id: ${accountId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Client not found with provided account ID',
          checked: {
            account_id: accountId,
            id_fallback: accountId
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const client = clients[0];
    console.log('Found client:', JSON.stringify(client, null, 2));
    
    // Get creator profile, either from joined data or separate query
    let creatorProfile = client.profiles;
    if (!creatorProfile) {
      console.log(`Querying for creator profile with ID: ${client.created_by}`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', client.created_by)
        .maybeSingle();
      
      if (profileError) {
        console.log('Error fetching creator profile:', profileError);
      } else {
        creatorProfile = profileData;
        console.log('Found creator profile:', JSON.stringify(creatorProfile, null, 2));
      }
    }
    
    // Check if contact exists
    const { data: existingContacts, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId.toString());
    
    if (contactError) {
      console.error('Error checking contact:', contactError);
      return new Response(
        JSON.stringify({ error: 'Failed to check contact', details: contactError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()) : [];
    console.log(`Parsed tags: ${JSON.stringify(tags)}`);
    
    // Insert or update contact
    if (existingContacts.length === 0) {
      // Insert new contact
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          id: contactId.toString(),
          name: contactName,
          phone_number: phoneNumber,
          client_id: client.id,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId
        });
      
      if (insertError) {
        console.error('Error creating contact:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create contact', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update daily stats for new contacts
      await updateDailyStats(supabase, null, 1, 0, 0);
    } else {
      // Update existing contact
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          name: contactName,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId.toString());
      
      if (updateError) {
        console.error('Error updating contact:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update contact', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Delete existing tags for this contact
    const { error: deleteTagsError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId.toString());
    
    if (deleteTagsError) {
      console.error('Error deleting contact tags:', deleteTagsError);
      // Continue despite error
    }
    
    // Use the creator of the client as the creator of the tags
    let creatorId = null;
    
    if (creatorProfile && creatorProfile.id) {
      creatorId = creatorProfile.id;
      console.log(`Using client creator as tag creator, ID: ${creatorId}, Name: ${creatorProfile.account_name}`);
    } else {
      console.log('Client creator not found, searching for alternative user...');
      
      // Try to find an admin user
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
      
      if (!adminError && adminUsers && adminUsers.length > 0) {
        creatorId = adminUsers[0].id;
        console.log(`Using admin user as alternative creator, ID: ${creatorId}`);
      } else {
        console.log('No admin user found, searching for any valid user...');
        
        // If no admin, get any user
        const { data: anyUser, error: anyUserError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (!anyUserError && anyUser && anyUser.length > 0) {
          creatorId = anyUser[0].id;
          console.log(`Using first available user as creator, ID: ${creatorId}`);
        } else {
          console.error('No valid user found for tag creator!');
        }
      }
    }
    
    if (!creatorId) {
      console.error('Could not find a valid user to create tags.');
      return new Response(
        JSON.stringify({ 
          error: 'No valid user found for creating tags',
          partial_success: true,
          contact: {
            id: contactId.toString(),
            name: contactName,
            tags
          }
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add tags for the contact
    let addedTags = 0;
    let existingTagsCount = 0;
    let tagErrors = 0;
    
    for (const tag of tags) {
      console.log(`Processing tag: ${tag}`);
      
      try {
        // Add relation between contact and tag
        const { error: insertTagError } = await supabase
          .from('contact_tags')
          .insert({
            contact_id: contactId.toString(),
            tag_name: tag
          });
        
        if (insertTagError && !insertTagError.message.includes('duplicate')) {
          console.error(`Error adding tag ${tag} to contact:`, insertTagError);
          tagErrors++;
          // Continue despite error
        }
        
        // Check if tag exists in global tags table
        console.log(`Checking if tag "${tag}" exists in global tags table`);
        const { data: existingTag, error: checkTagError } = await supabase
          .from('tags')
          .select('name')
          .eq('name', tag)
          .maybeSingle();
        
        if (checkTagError) {
          console.error(`Error checking tag ${tag}:`, checkTagError);
          tagErrors++;
        }
        
        // If tag doesn't exist, add it
        if (!existingTag) {
          console.log(`Tag "${tag}" not found in global table, adding...`);
          
          const { data: insertedTag, error: insertGlobalTagError } = await supabase
            .from('tags')
            .insert({
              name: tag,
              created_by: creatorId
            })
            .select()
            .single();
          
          if (insertGlobalTagError) {
            console.error(`Error adding tag ${tag} to global table:`, insertGlobalTagError);
            tagErrors++;
          } else {
            console.log(`Tag "${tag}" added successfully to global table:`, JSON.stringify(insertedTag));
            addedTags++;
          }
        } else {
          console.log(`Tag "${tag}" already exists in global table`);
          existingTagsCount++;
        }
      } catch (tagError) {
        console.error(`Unexpected error processing tag ${tag}:`, tagError);
        tagErrors++;
      }
    }
    
    // Process matching sequences
    await processMatchingSequences(supabase, contactId.toString(), tags, client.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contact processed successfully',
        stats: {
          tagsAdded: addedTags,
          existingTags: existingTagsCount,
          tagErrors
        },
        client: {
          id: client.id,
          account_id: client.account_id,
          accountName: client.account_name,
          creatorId: creatorId,
          creatorName: creatorProfile?.account_name || 'Desconhecido'
        },
        contact: {
          id: contactId.toString(),
          name: contactName,
          tags
        }
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

// Process matching sequences
async function processMatchingSequences(supabase, contactId: string, contactTags: string[], clientId: string) {
  try {
    // Get all active sequences from instances associated with this client
    const { data: instances, error: instancesError } = await supabase
      .from('instances')
      .select('id')
      .eq('client_id', clientId)
      .eq('active', true);
    
    if (instancesError) {
      console.error('Error fetching instances:', instancesError);
      return;
    }
    
    if (!instances.length) return;
    
    const instanceIds = instances.map((instance) => instance.id);
    
    // Get all active sequences for these instances
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('*, sequence_stages(*)')
      .in('instance_id', instanceIds)
      .eq('status', 'active');
    
    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError);
      return;
    }
    
    // Check current contact_sequences to avoid duplicates
    const { data: existingSequences, error: existingSeqError } = await supabase
      .from('contact_sequences')
      .select('sequence_id')
      .eq('contact_id', contactId)
      .in('status', ['active', 'completed']);
    
    if (existingSeqError) {
      console.error('Error fetching existing sequences:', existingSeqError);
      return;
    }
    
    const existingSequenceIds = new Set(existingSequences.map(seq => seq.sequence_id));
    
    for (const sequence of sequences) {
      // Skip if contact is already in this sequence
      if (existingSequenceIds.has(sequence.id)) continue;
      
      // Check start condition
      const shouldStart = checkCondition(
        sequence.start_condition_type,
        sequence.start_condition_tags,
        contactTags
      );
      
      // Check stop condition
      const shouldStop = checkCondition(
        sequence.stop_condition_type,
        sequence.stop_condition_tags,
        contactTags
      );
      
      // If contact matches start condition but not stop condition, add to sequence
      if (shouldStart && !shouldStop) {
        // Get sequence stages ordered by order_index
        let stages = sequence.sequence_stages;
        if (!stages || stages.length === 0) continue;
        
        stages.sort((a, b) => a.order_index - b.order_index);
        const firstStage = stages[0];
        
        // Create contact_sequence entry
        const { data: contactSequence, error: contactSeqError } = await supabase
          .from('contact_sequences')
          .insert({
            contact_id: contactId,
            sequence_id: sequence.id,
            current_stage_index: 0,
            current_stage_id: firstStage.id,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (contactSeqError) {
          console.error('Error creating contact_sequence:', contactSeqError);
          continue;
        }
        
        // Create stage progress entries
        for (const stage of stages) {
          const { error: progressError } = await supabase
            .from('stage_progress')
            .insert({
              contact_sequence_id: contactSequence.id,
              stage_id: stage.id,
              status: stage.id === firstStage.id ? 'pending' : 'pending'
            });
          
          if (progressError) {
            console.error('Error creating stage_progress:', progressError);
            // Continue despite error
          }
        }
        
        // Schedule the first message
        await scheduleMessage(supabase, contactId, sequence.id, firstStage);
      }
    }
  } catch (error) {
    console.error('Error processing matching sequences:', error);
  }
}

// Check if tags match condition
function checkCondition(conditionType: string, conditionTags: string[], contactTags: string[]): boolean {
  if (!conditionTags || conditionTags.length === 0) return false;
  
  if (conditionType === 'AND') {
    // All condition tags must be present in contact tags
    return conditionTags.every(tag => contactTags.includes(tag));
  } else { // 'OR'
    // At least one condition tag must be present in contact tags
    return conditionTags.some(tag => contactTags.includes(tag));
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
