import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowUpRight,
  Search,
} from "lucide-react";

import EventCard from "../components/EventCard";
import { getPublishedEvents } from "../lib/events";

const categories = [
  "All events",
  "Music",
  "Technology",
  "Arts & Culture",
  "Outdoors",
  "Business",
  "Other",
];

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All events");

  const [selectedCity, setSelectedCity] =
    useState("All locations");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setEvents(await getPublishedEvents());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const cities = [
    ...new Set(events.map((event) => event.city)),
  ];

  const filteredEvents = events.filter((event) => {
    const text = [
      event.title,
      event.city,
      event.venue,
      event.category,
      event.organizer,
    ]
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search.trim().toLowerCase()) &&
      (
        selectedCategory === "All events" ||
        event.category === selectedCategory
      ) &&
      (
        selectedCity === "All locations" ||
        event.city === selectedCity
      )
    );
  });

  function clearFilters() {
    setSearch("");
    setSelectedCategory("All events");
    setSelectedCity("All locations");
  }

  return (
    <main>
      <section className="hero container">
        <div className="hero-content">
          <span className="eyebrow">
            <span className="status-dot" />
            YOUR NEXT GREAT MEMORY
          </span>

          <h1>
            Less ordinary.
            <br />
            More <em>I was there.</em>
          </h1>

          <p>
            Find your people. Feel the energy.
            Discover experiences worth stepping out for.
          </p>

          <a
            href="#discover"
            className="button button-dark"
          >
            Find your next event
            <ArrowUpRight size={19} />
          </a>
        </div>

        <div className="hero-art">
          <div className="hero-art-top">
            <span>
              THE MOMENT
              <br />
              IS YOURS.
            </span>

            <ArrowUpRight size={30} />
          </div>

          <div
            className="hero-sun"
            aria-hidden="true"
          />

          <div className="hero-art-title">
            BE
            <br />
            <span>THERE.</span>
          </div>

          <div className="hero-art-bottom">
            <span>LIVE IT. FEEL IT. REMEMBER IT.</span>
            <span>EP / 001</span>
          </div>
        </div>
      </section>

      <div className="experience-strip">
        GOOD MUSIC ✳ GREAT PEOPLE ✳ BIG IDEAS
        ✳ NEW EXPERIENCES ✳
      </div>

      <section
        id="discover"
        className="discover-section container"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              MAKE ROOM IN YOUR CALENDAR
            </span>

            <h2>Out there. Waiting for you.</h2>
          </div>

          <button
            type="button"
            className="button button-small"
            onClick={loadEvents}
            disabled={loading}
          >
            Refresh events
          </button>
        </div>

        <div className="search-controls">
          <label className="search-box">
            <Search size={20} />

            <input
              type="search"
              aria-label="Search events"
              placeholder="Search events or places..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <select
            aria-label="Filter events by location"
            value={selectedCity}
            onChange={(event) =>
              setSelectedCity(event.target.value)
            }
          >
            <option>All locations</option>

            {cities.map((city) => (
              <option key={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "filter-button selected"
                  : "filter-button"
              }
              aria-pressed={
                selectedCategory === category
              }
              onClick={() =>
                setSelectedCategory(category)
              }
            >
              {category}
            </button>
          ))}
        </div>

        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : loading ? (
          <div className="empty-state" role="status">
            Loading events…
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <p className="results-count">
              {filteredEvents.length} experiences
            </p>

            <div className="events-grid">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>
              {events.length === 0
                ? "No upcoming events published yet."
                : "No matching events."}
            </h3>

            <p>
              {events.length === 0
                ? "Organizers can create and publish events from their dashboard."
                : "Try another category, location, or search."}
            </p>

            {events.length === 0 ? (
              <Link
                to="/organizer"
                className="button button-dark"
              >
                Create an event
              </Link>
            ) : (
              <button
                type="button"
                className="button button-dark"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      <section
        id="how-it-works"
        className="how-section container"
      >
        <span className="eyebrow">YOUR WAY IN</span>

        <h2>From discovery to the front door.</h2>

        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <h3>Discover</h3>
            <p>Find an event you would love to attend.</p>
          </article>

          <article className="step-card">
            <span className="step-number">02</span>
            <h3>Choose</h3>
            <p>Select your ticket category and quantity.</p>
          </article>

          <article className="step-card">
            <span className="step-number">03</span>
            <h3>Attend</h3>

            <p>
              Verified payment and admission tickets
              are the next stage of this build.
            </p>
          </article>
        </div>
      </section>

      <section
        id="organizers"
        className="organizer-banner container"
      >
        <div>
          <span className="eyebrow">
            FOR THE MOMENT MAKERS
          </span>

          <h2>
            Your idea.
            <br />
            Their next great experience.
          </h2>

          <p>
            Create an event, set your ticket categories,
            and publish it for your community.
          </p>

          <Link
            to="/organizer"
            className="button"
          >
            Open organizer workspace
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}