


import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { EventPoster } from "../components/EventCard";

import {
  events,
  formatDate,
  formatMoney,
  formatTime,
} from "../data/events";

export default function EventDetails() {
  const { id } = useParams();

  const event = events.find((item) => item.id === id);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  if (!event) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h1>Event not found.</h1>

          <p>The event may have been removed or the link is incorrect.</p>

          <Link to="/" className="button button-dark">
            Explore events
          </Link>
        </div>
      </main>
    );
  }

  const selectedTicket =
    event.ticketTypes.find(
      (ticket) => ticket.id === selectedTicketId
    ) || event.ticketTypes[0];

  const total = selectedTicket.price * quantity;

  function handleContinue(submitEvent) {
    submitEvent.preventDefault();

    setMessage(
      "Your selection is ready. Payment checkout will be enabled " +
        "after we connect the backend. No payment has been taken " +
        "and no admission ticket has been issued."
    );
  }

  return (
    <main className="container page-section">
      <Link to="/" className="back-link">
        <ArrowLeft size={17} />
        Back to experiences
      </Link>

      <div className="event-details-layout">
        <section className="event-information">
          <EventPoster event={event} large />

          <div className="event-title-block">
            <span className="eyebrow">
              {event.category} · {event.city}
            </span>

            <h1>{event.title}</h1>

            <p className="event-organizer">
              Hosted by {event.organizer}
            </p>
          </div>

          <div className="event-facts">
            <div>
              <CalendarDays size={19} />
              <span>{formatDate(event.startsAt)}</span>
            </div>

            <div>
              <Clock3 size={19} />

              <span>
                {formatTime(event.startsAt)} –{" "}
                {formatTime(event.endsAt)} EAT
              </span>
            </div>

            <div>
              <MapPin size={19} />
              <span>{event.venue}</span>
            </div>

            <div>
              <Users size={19} />
              <span>Venue capacity: {event.capacity} people</span>
            </div>
          </div>

          <div className="event-description">
            <h2>The experience</h2>
            <p>{event.description}</p>

            <h3>What to expect</h3>

            <ul className="highlight-list">
              {event.highlights.map((highlight) => (
                <li key={highlight}>
                  <CheckCircle2 size={17} />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="booking-panel">
          <span className="eyebrow">SAVE YOUR SPOT</span>
          <h2>See you there.</h2>

          <form onSubmit={handleContinue}>
            <fieldset className="ticket-options">
              <legend>Choose your ticket</legend>

              {event.ticketTypes.map((ticket) => (
                <label
                  key={ticket.id}
                  className={`ticket-option ${
                    selectedTicket.id === ticket.id ? "chosen" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="ticketType"
                    value={ticket.id}
                    checked={selectedTicket.id === ticket.id}
                    onChange={() => {
                      setSelectedTicketId(ticket.id);
                      setMessage("");
                    }}
                  />

                  <span className="ticket-option-description">
                    <strong>{ticket.name}</strong>
                    <small>{ticket.description}</small>
                  </span>

                  <strong>{formatMoney(ticket.price)}</strong>
                </label>
              ))}
            </fieldset>

            <label className="form-field">
              Number of tickets

              <select
                value={quantity}
                onChange={(changeEvent) => {
                  setQuantity(Number(changeEvent.target.value));
                  setMessage("");
                }}
              >
                {Array.from({ length: 10 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              Full name

              <input
                name="name"
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>

            <label className="form-field">
              Email address

              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>

            <label className="form-field">
              Phone number

              <input
                name="phone"
                type="tel"
                placeholder="0712 345 678"
                autoComplete="tel"
                required
                pattern="[+0-9 ()-]{9,20}"
              />
            </label>

            <div className="booking-summary">
              <div>
                <span>
                  {selectedTicket.name} × {quantity}
                </span>

                <span>{formatMoney(total)}</span>
              </div>

              <div className="booking-total">
                <strong>Total</strong>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>

            <button
              type="submit"
              className="button button-dark full-width"
            >
              Review selection
            </button>

            {message && (
              <div className="information-message" role="status">
                {message}
              </div>
            )}

            <p className="checkout-note">
              <ShieldCheck size={16} />
              Sample event · Payments are not connected yet
            </p>
          </form>
        </aside>
      </div>
    </main>
  );
}