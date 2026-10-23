export const categories = [
  "All events",
  "Music",
  "Technology",
  "Arts & Culture",
  "Outdoors",
  "Business",
];

export const events = [
  {
    id: "nairobi-after-hours",
    title: "Nairobi After Hours",
    category: "Music",
    city: "Nairobi",
    venue: "The Gardens, Nairobi",
    startsAt: "2026-12-19T15:00:00+03:00",
    endsAt: "2026-12-19T23:00:00+03:00",
    organizer: "After Hours Collective",
    capacity: 500,
    theme: "sunset",
    posterLines: ["AFTER", "HOURS."],

    description:
      "An open-air evening of live music, good food, and great company. Discover talented performers and spend an unforgettable evening under the Nairobi sky.",

    highlights: [
      "Live music performances",
      "Food and refreshment vendors",
      "Outdoor experience",
      "A dedicated VIP section",
    ],

    ticketTypes: [
      {
        id: "early-bird",
        name: "Early Bird",
        price: 1000,
        description: "Limited early access tickets.",
      },
      {
        id: "regular",
        name: "Regular",
        price: 1500,
        description: "General admission to the event.",
      },
      {
        id: "vip",
        name: "VIP",
        price: 3500,
        description: "Premium seating and a dedicated VIP area.",
      },
    ],
  },

  {
    id: "build-something-great",
    title: "Build Something Great",
    category: "Technology",
    city: "Meru",
    venue: "Innovation Hub, Meru",
    startsAt: "2026-12-12T09:00:00+03:00",
    endsAt: "2026-12-12T17:00:00+03:00",
    organizer: "Builders Community",
    capacity: 150,
    theme: "tech",
    posterLines: ["IDEAS INTO", "IMPACT."],

    description:
      "A day of practical workshops, conversations, and connections for developers and curious builders. Bring your laptop, meet other creators, and turn an idea into something real.",

    highlights: [
      "Practical development workshops",
      "Networking with other developers",
      "Project demonstrations",
      "Community discussions",
    ],

    ticketTypes: [
      {
        id: "student",
        name: "Student Pass",
        price: 300,
        description: "Admission for students.",
      },
      {
        id: "community",
        name: "Community Pass",
        price: 500,
        description: "Full access to workshops and networking.",
      },
    ],
  },

  {
    id: "the-creative-table",
    title: "The Creative Table",
    category: "Arts & Culture",
    city: "Nairobi",
    venue: "Studio Collective, Nairobi",
    startsAt: "2027-01-09T11:00:00+03:00",
    endsAt: "2027-01-09T18:00:00+03:00",
    organizer: "Creative Collective",
    capacity: 100,
    theme: "art",
    posterLines: ["MAKE", "ROOM."],

    description:
      "Meet independent artists, explore original work, and spend an afternoon creating something of your own. A welcoming space for art, design, and creative conversations.",

    highlights: [
      "Independent art exhibitions",
      "Creative workshops",
      "Meet local artists",
      "Art and design conversations",
    ],

    ticketTypes: [
      {
        id: "day-pass",
        name: "Day Pass",
        price: 1000,
        description: "Entry to exhibitions and open activities.",
      },
      {
        id: "workshop-pass",
        name: "Workshop Pass",
        price: 1800,
        description: "Admission plus a guided creative workshop.",
      },
    ],
  },

  {
    id: "trails-and-good-company",
    title: "Trails & Good Company",
    category: "Outdoors",
    city: "Nairobi",
    venue: "Karura Forest, Nairobi",
    startsAt: "2027-01-16T07:00:00+03:00",
    endsAt: "2027-01-16T13:00:00+03:00",
    organizer: "Outside Together",
    capacity: 80,
    theme: "forest",
    posterLines: ["GET", "OUTSIDE."],

    description:
      "Step away from your usual routine for a guided morning walk, fresh air, and new connections. Come with a friend or meet someone new along the trail.",

    highlights: [
      "Guided group walk",
      "Community activities",
      "Photography opportunities",
      "Outdoor networking",
    ],

    ticketTypes: [
      {
        id: "explorer",
        name: "Explorer Pass",
        price: 800,
        description: "Admission to the guided group experience.",
      },
      {
        id: "explorer-plus",
        name: "Explorer Plus",
        price: 1200,
        description: "Admission with a refreshment package.",
      },
    ],
  },
];

export function formatMoney(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}