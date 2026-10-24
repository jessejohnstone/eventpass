import { supabase } from "./supabase.js";

// Poster text used by EventCard and EventDetails.
const posterStyles = {
  sunset: ["AFTER", "HOURS."],
  tech: ["IDEAS INTO", "IMPACT."],
  art: ["MAKE", "ROOM."],
  forest: ["GET", "OUTSIDE."],
};

// Fields needed by the event pages and dashboard.
const eventFields = `
  id,
  owner_id,
  title,
  organizer_name,
  description,
  category,
  city,
  venue,
  starts_at,
  ends_at,
  capacity,
  theme,
  highlights,
  published,
  created_at,
  ticket_types (
    id,
    name,
    description,
    price,
    quantity,
    position
  )
`;

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart npm run dev."
    );
  }

  return supabase;
}

// Convert database fields into the format
// used by your React components.
function mapEvent(row) {
  const ticketTypes = [...(row.ticket_types || [])]
    .sort((first, second) => {
      return first.position - second.position;
    })
    .map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description || "",

      // Database stores minor units.
      // Example: 50000 becomes KSh 500.
      price: ticket.price / 100,

      quantity: ticket.quantity,
    }));

  return {
    id: row.id,
    ownerId: row.owner_id,

    title: row.title,
    organizer: row.organizer_name,
    description: row.description,

    category: row.category,
    city: row.city,
    venue: row.venue,

    startsAt: row.starts_at,
    endsAt: row.ends_at,

    capacity: row.capacity,

    theme: row.theme,

    posterLines:
      posterStyles[row.theme] ||
      posterStyles.sunset,

    highlights: row.highlights || [],

    published: row.published,
    createdAt: row.created_at,

    ticketTypes,
  };
}

// Get upcoming published events for the homepage.
export async function getPublishedEvents() {
  const client = requireSupabase();

  const { data, error } = await client
    .from("events")
    .select(eventFields)
    .eq("published", true)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapEvent);
}

// Get one event.
//
// Supabase RLS controls visibility:
// - Anyone can read published events.
// - An organizer can also read their own drafts.
export async function getEventById(eventId) {
  const client = requireSupabase();

  // Old sample-event links are not database UUIDs.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof eventId !== "string" ||
    !uuidPattern.test(eventId)
  ) {
    return null;
  }

  const { data, error } = await client
    .from("events")
    .select(eventFields)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapEvent(data) : null;
}

// Get the signed-in organizer's events.
//
// The owner filter selects their records;
// database RLS remains responsible for access control.
export async function getOrganizerEvents(ownerId) {
  const client = requireSupabase();

  if (!ownerId) {
    throw new Error(
      "Sign in to view your events."
    );
  }

  const { data, error } = await client
    .from("events")
    .select(eventFields)
    .eq("owner_id", ownerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapEvent);
}

// Create an event and its ticket categories together.
//
// CreateEventForm already converts ticket prices
// into minor units before calling this function.
// Do not multiply those prices by 100 again here.
//
// The database function determines the owner
// from the authenticated session.
export async function createOrganizerEvent(
  eventDetails,
  ticketTypes
) {
  const client = requireSupabase();

  if (!eventDetails) {
    throw new Error(
      "Event details are required."
    );
  }

  if (
    !Array.isArray(ticketTypes) ||
    ticketTypes.length < 1 ||
    ticketTypes.length > 6
  ) {
    throw new Error(
      "Add between 1 and 6 ticket categories."
    );
  }

  const { data, error } = await client.rpc(
    "create_organizer_event",
    {
      p_event: eventDetails,
      p_tickets: ticketTypes,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  // Returns the newly created event's UUID.
  return data;
}

// Publish or unpublish an event.
//
// The database function verifies ownership.
export async function setEventPublished(
  eventId,
  published
) {
  const client = requireSupabase();

  if (!eventId) {
    throw new Error(
      "An event ID is required."
    );
  }

  if (typeof published !== "boolean") {
    throw new Error(
      "Publication status must be true or false."
    );
  }

  const { error } = await client.rpc(
    "set_event_published",
    {
      p_id: eventId,
      p_published: published,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}