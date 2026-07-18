// =====================================================
// Supabase client + data access helpers
//
// SUPABASE_URL / SUPABASE_ANON_KEY are safe to expose in
// client-side code — access is governed by the Row Level
// Security policies defined in schema.sql, not by secrecy
// of these values.
// =====================================================

const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------
// Guest-facing
// -----------------------------------------------------

/**
 * Search for a guest by (partial, case-insensitive) name across all events.
 * Returns event_guests rows joined with their event and rsvp.
 */
async function searchGuest(name) {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const { data, error } = await supabaseClient
    .from('event_guests')
    .select(`
      id,
      guest_name,
      max_plus_ones,
      is_invited,
      notes,
      master_guest_id,
      events (
        id, name, slug, date, time, venue, venue_address,
        additional_info, is_active, rsvp_deadline
      ),
      rsvps (
        id, response, plus_ones_count, plus_one_names, dietary_notes, updated_at
      )
    `)
    .ilike('guest_name', `%${trimmed}%`)
    .eq('is_invited', true);

  if (error) throw error;
  return data || [];
}

/**
 * Upsert an RSVP for a given event_guest.
 */
async function saveRSVP(eventGuestId, data) {
  const payload = {
    event_guest_id: eventGuestId,
    response: data.response,
    plus_ones_count: data.plusOnesCount || 0,
    plus_one_names: data.plusOneNames || [],
    dietary_notes: data.dietaryNotes || null,
    updated_at: new Date().toISOString()
  };

  const { data: result, error } = await supabaseClient
    .from('rsvps')
    .upsert(payload, { onConflict: 'event_guest_id' })
    .select()
    .single();

  if (error) throw error;
  return result;
}

// -----------------------------------------------------
// Admin: events
// -----------------------------------------------------

async function getAllEvents() {
  const { data: events, error } = await supabaseClient
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;

  const eventsWithStats = await Promise.all(
    (events || []).map(async (event) => {
      const stats = await getEventStats(event.id);
      return { ...event, stats };
    })
  );

  return eventsWithStats;
}

async function getEventStats(eventId) {
  const { data, error } = await supabaseClient
    .from('event_guests')
    .select(`
      id, max_plus_ones,
      rsvps ( response, plus_ones_count )
    `)
    .eq('event_id', eventId)
    .eq('is_invited', true);

  if (error) throw error;

  const rows = data || [];
  let yes = 0, no = 0, pending = 0, headcount = 0;

  rows.forEach((row) => {
    const rsvp = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    const response = rsvp?.response || 'pending';
    if (response === 'yes') {
      yes++;
      headcount += 1 + (rsvp.plus_ones_count || 0);
    } else if (response === 'no') {
      no++;
    } else {
      pending++;
    }
  });

  return {
    totalInvited: rows.length,
    yes,
    no,
    pending,
    headcount
  };
}

async function getEventBySlugOrId(idOrSlug) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', idOrSlug)
    .single();

  if (error) throw error;
  return data;
}

async function createEvent(data) {
  const { data: result, error } = await supabaseClient
    .from('events')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function updateEvent(eventId, data) {
  const { data: result, error } = await supabaseClient
    .from('events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function deleteEvent(eventId) {
  const { error } = await supabaseClient
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
  return true;
}

async function toggleEventActive(eventId, active) {
  return updateEvent(eventId, { is_active: active });
}

/**
 * Duplicate an event, optionally copying its guestlist.
 */
async function duplicateEvent(eventId, newEventData, options = { copyGuests: true, keepMaxPlusOnes: true, keepNotes: true }) {
  const original = await getEventBySlugOrId(eventId);

  const newEvent = await createEvent({
    name: newEventData.name,
    slug: newEventData.slug,
    date: newEventData.date || null,
    time: newEventData.time || original.time,
    venue: newEventData.venue || original.venue,
    venue_address: newEventData.venue_address || original.venue_address,
    additional_info: newEventData.additional_info ?? original.additional_info,
    rsvp_deadline: newEventData.rsvp_deadline || null,
    is_active: newEventData.is_active ?? true
  });

  if (options.copyGuests) {
    const { data: guests, error } = await supabaseClient
      .from('event_guests')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;

    if (guests && guests.length) {
      const rows = guests.map((g) => ({
        event_id: newEvent.id,
        guest_name: g.guest_name,
        master_guest_id: g.master_guest_id,
        max_plus_ones: options.keepMaxPlusOnes ? g.max_plus_ones : 0,
        is_invited: true,
        notes: options.keepNotes ? g.notes : null
      }));

      const { error: insertError } = await supabaseClient
        .from('event_guests')
        .insert(rows);

      if (insertError) throw insertError;
    }
  }

  return newEvent;
}

// -----------------------------------------------------
// Admin: event guests
// -----------------------------------------------------

async function getEventGuests(eventId) {
  const { data, error } = await supabaseClient
    .from('event_guests')
    .select(`
      id, guest_name, max_plus_ones, is_invited, notes, master_guest_id, created_at,
      rsvps ( response, plus_ones_count, plus_one_names, dietary_notes, updated_at )
    `)
    .eq('event_id', eventId)
    .order('guest_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function addGuestToEvent(eventId, guestData) {
  let masterGuestId = guestData.masterGuestId || null;

  // Optionally create a new master_guests record
  if (!masterGuestId && guestData.addToMasterList) {
    const { data: master, error: masterError } = await supabaseClient
      .from('master_guests')
      .insert({
        name: guestData.guestName,
        email: guestData.email || null,
        phone: guestData.phone || null
      })
      .select()
      .single();

    if (masterError) throw masterError;
    masterGuestId = master.id;
  }

  const { data, error } = await supabaseClient
    .from('event_guests')
    .insert({
      event_id: eventId,
      guest_name: guestData.guestName,
      master_guest_id: masterGuestId,
      max_plus_ones: guestData.maxPlusOnes || 0,
      notes: guestData.notes || null,
      is_invited: true
    })
    .select()
    .single();

  if (error) throw error;

  // Seed a pending rsvp row so stats/UI have something to key off of
  await supabaseClient.from('rsvps').insert({
    event_guest_id: data.id,
    response: 'pending'
  });

  return data;
}

async function updateGuest(eventGuestId, data) {
  const { data: result, error } = await supabaseClient
    .from('event_guests')
    .update({
      guest_name: data.guestName,
      max_plus_ones: data.maxPlusOnes,
      notes: data.notes
    })
    .eq('id', eventGuestId)
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function removeGuestFromEvent(eventGuestId) {
  const { error } = await supabaseClient
    .from('event_guests')
    .delete()
    .eq('id', eventGuestId);

  if (error) throw error;
  return true;
}

async function searchMasterGuests(query) {
  const { data, error } = await supabaseClient
    .from('master_guests')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function getPendingGuests(eventId) {
  const guests = await getEventGuests(eventId);
  return guests.filter((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    return !rsvp || rsvp.response === 'pending';
  });
}

// -----------------------------------------------------
// CSV import / export
// -----------------------------------------------------

async function exportEventGuests(eventId) {
  const guests = await getEventGuests(eventId);

  const rows = guests.map((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    return {
      guest_name: g.guest_name,
      max_plus_ones: g.max_plus_ones,
      rsvp_status: rsvp?.response || 'pending',
      plus_ones_confirmed: rsvp?.plus_ones_count || 0,
      plus_one_names: (rsvp?.plus_one_names || []).join('; '),
      dietary_notes: rsvp?.dietary_notes || '',
      notes: g.notes || ''
    };
  });

  return rows;
}

async function importEventGuests(eventId, guests) {
  // guests: [{ guest_name, email, phone, max_plus_ones, notes }]
  const results = { inserted: 0, skipped: 0, errors: [] };

  for (const g of guests) {
    if (!g.guest_name || !g.guest_name.trim()) {
      results.skipped++;
      continue;
    }
    try {
      await addGuestToEvent(eventId, {
        guestName: g.guest_name.trim(),
        maxPlusOnes: parseInt(g.max_plus_ones, 10) || 0,
        notes: g.notes || null,
        email: g.email || null,
        phone: g.phone || null,
        addToMasterList: true
      });
      results.inserted++;
    } catch (err) {
      results.errors.push({ guest: g.guest_name, message: err.message });
    }
  }

  return results;
}
