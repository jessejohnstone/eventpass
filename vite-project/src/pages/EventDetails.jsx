import { useState } from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  EventPoster,
} from "../components/EventCard.jsx";

import {
  events,
  formatDate,
  formatMoney,
  formatTime,
} from "../data/event .js";

export default function EventDetails() {
  const { id } = useParams();

  const event = events.find(
    (item) => item.id === id
  );

  const [selectedTicketId, setSelectedTicketId] =
    useState("");

  const [quantity, setQuantity] = useState(1);

  const [review, setReview] = useState(null);
  const [error, setError] = useState("");

  if (!event) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h1>Event not found.</h1>

          <p>
            The event may have been removed or the
            link is incorrect.
          </p>

          <Link
            to="/"
            className="button button-dark"
          >
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

  if (!selectedTicket) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h1>{event.title}</h1>

          <p>
            Ticket options are not available for
            this event yet.
          </p>

          <Link
            to="/"
            className="button button-dark"
          >
            Explore other events
          </Link>
        </div>
      </main>
    );
  }

  const total = selectedTicket.price * quantity;

  function clearReview() {
    setReview(null);
    setError("");
  }

  function handleContinue(submitEvent) {
    submitEvent.preventDefault();

    clearReview();

    const formData = new FormData(
      submitEvent.currentTarget
    );

    const name = String(
      formData.get("name") || ""
    ).trim();

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase();

    const phone = String(
      formData.get("phone") || ""
    ).trim();

    if (name.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      setError(
        "Please select between 1 and 10 tickets."
      );

      return;
    }

    setReview({
      eventId: event.id,
      name,
      email,
      phone,
      ticketName: selectedTicket.name,
      quantity,
      total,
    });
  }

  return (
    <main className="container page-section">
      <Link
        to="/"
        className="back-link"
      >
        <ArrowLeft size={17} />
        Back to experiences
      </Link>

      <div className="event-details-layout">
        <section className="event-information">
          <EventPoster
            event={event}
            large
          />

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

              <span>
                {formatDate(event.startsAt)}
              </span>
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

              <span>
                Venue capacity: {event.capacity} people
              </span>
            </div>
          </div>

          <div className="event-description">
            <h2>The experience</h2>

            <p>{event.description}</p>

            <h3>What to expect</h3>

            <ul className="highlight-list">
              {event.highlights.map(
                (highlight) => (
                  <li key={highlight}>
                    <CheckCircle2 size={17} />
                    <span>{highlight}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </section>

        <aside className="booking-panel">
          <span className="eyebrow">
            SAVE YOUR SPOT
          </span>

          <h2>See you there.</h2>

          <form onSubmit={handleContinue}>
            <fieldset className="ticket-options">
              <legend>
                Choose your ticket
              </legend>

              {event.ticketTypes.map((ticket) => (
                <label
                  key={ticket.id}
                  className={
                    `ticket-option ${
                      selectedTicket.id === ticket.id
                        ? "chosen"
                        : ""
                    }`
                  }
                >
                  <input
                    type="radio"
                    name="ticketType"
                    value={ticket.id}
                    checked={
                      selectedTicket.id === ticket.id
                    }
                    onChange={() => {
                      setSelectedTicketId(ticket.id);
                      clearReview();
                    }}
                  />

                  <span className="ticket-option-description">
                    <strong>
                      {ticket.name}
                    </strong>

                    <small>
                      {ticket.description}
                    </small>
                  </span>

                  <strong>
                    {formatMoney(ticket.price)}
                  </strong>
                </label>
              ))}
            </fieldset>

            <label className="form-field">
              Number of tickets

              <select
                name="quantity"
                value={quantity}
                onChange={(changeEvent) => {
                  setQuantity(
                    Number(changeEvent.target.value)
                  );

                  clearReview();
                }}
              >
                {Array.from(
                  { length: 10 },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {index + 1}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="form-field">
              Full name

              <input
                name="name"
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                onChange={clearReview}
                required
              />
            </label>

            <label className="form-field">
              Email address

              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                onChange={clearReview}
                required
              />
            </label>

            <label className="form-field">
              Phone number

              <input
                name="phone"
                type="tel"
                placeholder="0712 345 678"
                autoComplete="tel"
                pattern="[+0-9 ()-]{9,20}"
                onChange={clearReview}
                required
              />
            </label>

            <div className="booking-summary">
              <div>
                <span>
                  {selectedTicket.name} × {quantity}
                </span>

                <span>
                  {formatMoney(total)}
                </span>
              </div>

              <div className="booking-total">
                <strong>Total</strong>

                <strong>
                  {formatMoney(total)}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              className="button button-dark full-width"
            >
              Review selection
            </button>

            {error && (
              <div
                className="information-message"
                role="alert"
              >
                {error}
              </div>
            )}

            {review?.eventId === event.id && (
              <section
                className="information-message"
                role="status"
                aria-live="polite"
              >
                <h3>Your selection</h3>

                <p>
                  <strong>Name:</strong>{" "}
                  {review.name}
                  <br />

                  <strong>Event:</strong>{" "}
                  {event.title}
                  <br />

                  <strong>Ticket:</strong>{" "}
                  {review.ticketName}
                  <br />

                  <strong>Quantity:</strong>{" "}
                  {review.quantity}
                  <br />

                  <strong>Total:</strong>{" "}
                  {formatMoney(review.total)}
                  <br />

                  <strong>Email:</strong>{" "}
                  {review.email}
                  <br />

                  <strong>Phone:</strong>{" "}
                  {review.phone}
                </p>

                <p>
                  This selection has not been saved
                  as a booking. No payment has been
                  taken or admission ticket issued.
                </p>
              </section>
            )}

            <p className="checkout-note">
              <ShieldCheck size={16} />

              Sample event · Selection review only
            </p>
          </form>
        </aside>
      </div>
    </main>
  );
}