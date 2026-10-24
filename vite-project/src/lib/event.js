import { supabase } from "./supabase";

const posterStyles = {
  sunset: ["AFTER", "HOURS."],
  tech: ["IDEAS INTO", "IMPACT."],
  art: ["MAKE", "ROOM."],
  forest: ["GET", "OUTSIDE."],
};

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check .env.local and restart the server."
    );
  }

  return supabase;
}

function mapEvent(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,

    title: row.title,
    description: row.description,
    organizer: row.organizer_name,

    category: row.category,
    city: row.city,
    venue: row.venue,

    startsAt: row.starts_at,
    endsAt: row.ends_at,

    capacity: row.capacity,
    theme: row.theme,
    published: row.published,

    highlights: row.highlights || [],

    posterLines:
      posterStyles[row.theme] || posterStyles.sunset,

    ticketTypes: [...(row.ticket_types || [])]
      .sort((a, b) => a.position - b.position)
      .map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        description: ticket.description,

        // Database minor units → Kenyan shillings.
        price: ticket.price / 100,

        quantity: ticket.quantity,
      })),
  };
}

export async function getPublishedEvents() {
  const client = requireSupabase();

  const { data, error } = await client
    .from("events")
    .select("*, ticket_types(*)")
    .eq("published", true)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return data.map(mapEvent);
}

export async function getEventById(id) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapEvent(data) : null;
}

export async function getOrganizerEvents(ownerId) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("events")
    .select("*, ticket_types(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map(mapEvent);
}

export async function createOrganizerEvent(
  eventDetails,
  ticketTypes
) {
  const client = requireSupabase();

  const { data, error } = await client.rpc(
    "create_organizer_event",
    {
      p_event: eventDetails,
      p_tickets: ticketTypes,
    }
  );

  if (error) throw error;

  return data;
}

export async function setEventPublished(
  eventId,
  published
) {
  const client = requireSupabase();

  const { error } = await client.rpc(
    "set_event_published",
    {
      p_id: eventId,
      p_published: published,
    }
  );

  if (error) throw error;
}