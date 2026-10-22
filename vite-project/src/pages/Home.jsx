import { useState } from "react";
import { ArrowUpRight, Search, Ticket } from "lucide-react";

import EventCard from "../components/EventCard";
import { categories, events } from "../data/events";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All events");
  const [selectedCity, setSelectedCity] = useState("All locations");

  const cities = [...new Set(events.map((event) => event.city))];

  const filteredEvents = events.filter((event) => {
    const searchableText =
      `${event.title} ${event.category} ${event.city} ${event.venue}`
        .toLowerCase();

    const matchesSearch = searchableText.includes(
      search.trim().toLowerCase()
    );

    const matchesCategory =
      selectedCategory === "All events" ||
      event.category === selectedCategory;

    const matchesCity =
      selectedCity === "All locations" ||
      event.city === selectedCity;

    return matchesSearch && matchesCategory && matchesCity;
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
            Find your people. Feel the energy. Discover experiences
            worth stepping out for.
          </p>

          <a href="#discover" className="button button-dark">
            Find your next event
            <ArrowUpRight size={19} />
          </a>

          <div className="hero-note">
            <Ticket size={18} />
            <span>One ticket. A whole new story.</span>
          </div>
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

          <div className="hero-sun" aria-hidden="true" />

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
        GOOD MUSIC ✳ GREAT PEOPLE ✳ BIG IDEAS ✳ NEW EXPERIENCES
        ✳ GOOD MUSIC ✳ GREAT PEOPLE ✳ BIG IDEAS
      </div>

      <section id="discover" className="discover-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              MAKE ROOM IN YOUR CALENDAR
            </span>

            <h2>Out there. Waiting for you.</h2>
          </div>

          <p>Find something that feels like you.</p>
        </div>

        <div className="search-controls">
          <label className="search-box">
            <Search size={20} />

            <input
              type="search"
              aria-label="Search events"
              placeholder="Search events, interests, or places..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter events by location"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
          >
            <option>All locations</option>

            {cities.map((city) => (
              <option key={city}>{city}</option>
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
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>

        <p className="results-count">
          {filteredEvents.length}{" "}
          {filteredEvents.length === 1 ? "experience" : "experiences"}
        </p>

        {filteredEvents.length > 0 ? (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No events found.</h3>
            <p>Try another search, category, or location.</p>

            <button
              type="button"
              className="button button-dark"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section id="how-it-works" className="how-section container">
        <span className="eyebrow">YOUR WAY IN</span>
        <h2>From discovery to the front door.</h2>

        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <h3>Find your experience</h3>
            <p>
              Explore events and choose something you would love
              to attend.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">02</span>
            <h3>Choose your ticket</h3>
            <p>
              Select your ticket category and quantity, then
              complete checkout once payments are connected.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">03</span>
            <h3>Show up and enjoy</h3>
            <p>
              After verified payment, your unique QR ticket will
              be used for admission.
            </p>
          </article>
        </div>
      </section>

      <section id="organizers" className="organizer-banner container">
        <div>
          <span className="eyebrow">FOR THE MOMENT MAKERS</span>

          <h2>
            Your idea.
            <br />
            Their next great experience.
          </h2>

          <p>
            Our organizer workspace will bring event publishing,
            ticket sales, entrance scanning, and planning together.
          </p>
        </div>

        <div className="organizer-feature-list">
          <div>
            <span>01</span>
            <p>Create events and ticket categories</p>
          </div>

          <div>
            <span>02</span>
            <p>Track verified sales and attendance</p>
          </div>

          <div>
            <span>03</span>
            <p>Plan with budget calculations and AI assistance</p>
          </div>
        </div>
      </section>
    </main>
  );
}