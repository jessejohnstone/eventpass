import {
  useEffect,
  useRef,
  useState,
} from "react";

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
  formatDate,
  formatMoney,
  formatTime,
} from "../data/event.js";

import {
  getEventById,
} from "../lib/events.js";

import {
  startCheckout,
} from "../lib/payments.js";

export default function EventDetails() {
  const { id } = useParams();

  // Event loading.
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  // Ticket selection.
  const [selectedTicketId, setSelectedTicketId] =
    useState("");

  const [quantity, setQuantity] = useState(1);

  // Buyer information.
  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Selection review.
  const [review, setReview] = useState(null);
  const [formError, setFormError] = useState("");

  // Payment request.
  const [paymentBusy, setPaymentBusy] =
    useState(false);

  const paymentLock = useRef(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");
    setEvent(null);

    setSelectedTicketId("");
    setQuantity(1);

    setBuyer({
      name: "",
      email: "",
      phone: "",
    });

    setReview(null);
    setFormError("");

    async function loadEvent() {
      try {
        const result = await getEventById(id);

        if (!active) return;

        setEvent(result);

        if (result?.ticketTypes?.length) {
          setSelectedTicketId(
            result.ticketTypes[0].id
          );
        }
      } catch (requestError) {
        if (!active) return;

        setLoadError(
          requestError.message ||
            "We couldn’t load this event."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [id, reloadCount]);

  const ticketTypes = event?.ticketTypes || [];

  const selectedTicket =
    ticketTypes.find(
      (ticket) => ticket.id === selectedTicketId
    ) || ticketTypes[0];

  // These are allocation limits, not real-time
  // remaining inventory. The server checks that.
  const maximumQuantity =
    selectedTicket && event
      ? Math.max(
          0,
          Math.min(
            10,
            selectedTicket.quantity,
            event.capacity
          )
        )
      : 0;

  const total = selectedTicket
    ? selectedTicket.price * quantity
    : 0;

  const eventHasStarted = event
    ? new Date(event.startsAt).getTime() <= Date.now()
    : false;

  const canReview = Boolean(
    event?.published &&
      selectedTicket &&
      maximumQuantity > 0 &&
      !eventHasStarted
  );

  function clearReview() {
    setReview(null);
    setFormError("");
  }

  function handleBuyerChange(changeEvent) {
    const { name, value } = changeEvent.target;

    setBuyer((current) => ({
      ...current,
      [name]: value,
    }));

    clearReview();
  }

  function handleTicketChange(ticketId) {
    setSelectedTicketId(ticketId);
    setQuantity(1);
    clearReview();
  }

  function handleQuantityChange(changeEvent) {
    setQuantity(
      Number(changeEvent.target.value)
    );

    clearReview();
  }

  function retryLoading() {
    if (paymentLock.current) return;

    setReloadCount((current) => current + 1);
  }

  function handleReview(submitEvent) {
    submitEvent.preventDefault();

    if (paymentLock.current) return;

    setFormError("");
    setReview(null);

    if (!event || !selectedTicket) {
      setFormError(
        "Please select a ticket category."
      );

      return;
    }

    if (!event.published) {
      setFormError(
        "This event is still a draft. Publish it before accepting bookings."
      );

      return;
    }

    if (
      new Date(event.startsAt).getTime() <= Date.now()
    ) {
      setFormError(
        "Ticket selection is closed because this event has started."
      );

      return;
    }

    const name = buyer.name.trim();

    const email = buyer.email
      .trim()
      .toLowerCase();

    const phone = buyer.phone.trim();

    if (name.length < 2) {
      setFormError(
        "Please enter your full name."
      );

      return;
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setFormError(
        "Please enter a valid email address."
      );

      return;
    }

    if (!/^[+0-9 ()-]{9,20}$/.test(phone)) {
      setFormError(
        "Please enter a valid phone number."
      );

      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maximumQuantity
    ) {
      setFormError(
        `Please select between 1 and ${maximumQuantity} tickets.`
      );

      return;
    }

    setReview({
      eventId: event.id,
      eventTitle: event.title,

      ticketTypeId: selectedTicket.id,
      ticketName: selectedTicket.name,

      name,
      email,
      phone,

      quantity,
      unitPrice: selectedTicket.price,
      total,
    });
  }

  async function handlePayment() {
    // Ref prevents repeated clicks from starting
    // multiple requests before React re-renders.
    if (paymentLock.current || !review) {
      return;
    }

    if (
      !event ||
      review.eventId !== event.id ||
      !event.published
    ) {
      setFormError(
        "Please review your ticket selection again."
      );

      return;
    }

    if (
      new Date(event.startsAt).getTime() <= Date.now()
    ) {
      setFormError(
        "This event has started. Checkout is closed."
      );

      return;
    }

    paymentLock.current = true;
    setPaymentBusy(true);
    setFormError("");

    try {
      await startCheckout({
        eventId: review.eventId,
        ticketTypeId: review.ticketTypeId,

        quantity: review.quantity,

        name: review.name,
        email: review.email,
        phone: review.phone,
      });

      // startCheckout redirects to Paystack.
      // Keep the form locked while navigating.
    } catch (paymentError) {
      setFormError(
        paymentError.message ||
          "Could not open payment checkout. Please try again."
      );

      paymentLock.current = false;
      setPaymentBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container page-section">
        <Link
          to="/"
          className="back-link"
        >
          <ArrowLeft size={17} />
          Back to experiences
        </Link>

        <div
          className="empty-state"
          role="status"
          aria-live="polite"
        >
          <h2>Loading event…</h2>
          <p>Getting the event details.</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container page-section">
        <Link
          to="/"
          className="back-link"
        >
          <ArrowLeft size={17} />
          Back to experiences
        </Link>

        <div className="empty-state">
          <h1>We couldn’t load this event.</h1>

          <div
            className="auth-error"
            role="alert"
          >
            {loadError}
          </div>

          <button
            type="button"
            className="button button-dark"
            onClick={retryLoading}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h1>Event not available.</h1>

          <p>
            This event may be unpublished,
            or the link may be incorrect.
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

  return (
    <main className="container page-section">
      <Link
        to="/"
        className="back-link"
      >
        <ArrowLeft size={17} />
        Back to experiences
      </Link>

      {!event.published && (
        <div
          className="information-message"
          role="status"
        >
          <strong>Draft preview.</strong>{" "}
          This event is not visible to the public.
          Publish it from your organizer dashboard
          when it is ready.

          <div className="event-actions">
            <Link
              to="/organizer"
              className="button button-small"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      )}

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
              <CalendarDays
                size={19}
                aria-hidden="true"
              />

              <span>
                {formatDate(event.startsAt)}
              </span>
            </div>

            <div>
              <Clock3
                size={19}
                aria-hidden="true"
              />

              <span>
                {formatTime(event.startsAt)}
                {" – "}
                {formatTime(event.endsAt)}
                {" EAT"}
              </span>
            </div>

            <div>
              <MapPin
                size={19}
                aria-hidden="true"
              />

              <span>{event.venue}</span>
            </div>

            <div>
              <Users
                size={19}
                aria-hidden="true"
              />

              <span>
                Venue capacity:{" "}
                {event.capacity} people
              </span>
            </div>
          </div>

          <div className="event-description">
            <h2>The experience</h2>

            <p
              style={{
                whiteSpace: "pre-wrap",
              }}
            >
              {event.description}
            </p>

            {event.highlights?.length > 0 && (
              <>
                <h3>What to expect</h3>

                <ul className="highlight-list">
                  {event.highlights.map(
                    (highlight, index) => (
                      <li
                        key={`${index}-${highlight}`}
                      >
                        <CheckCircle2
                          size={17}
                          aria-hidden="true"
                        />

                        <span>{highlight}</span>
                      </li>
                    )
                  )}
                </ul>
              </>
            )}
          </div>
        </section>

        <aside className="booking-panel">
          <span className="eyebrow">
            SAVE YOUR SPOT
          </span>

          <h2>See you there.</h2>

          {eventHasStarted && (
            <div
              className="information-message"
              role="status"
            >
              This event has started.
              Ticket selection is closed.
            </div>
          )}

          {ticketTypes.length === 0 ? (
            <div className="information-message">
              Ticket categories have not been
              added to this event yet.
            </div>
          ) : (
            <form
              onSubmit={handleReview}
              aria-busy={paymentBusy}
            >
              <fieldset
                disabled={paymentBusy || !canReview}
                style={{
                  border: 0,
                  padding: 0,
                  margin: 0,
                  minWidth: 0,
                }}
              >
                <fieldset className="ticket-options">
                  <legend>
                    Choose your ticket
                  </legend>

                  {ticketTypes.map((ticket) => (
                    <label
                      key={ticket.id}
                      className={
                        `ticket-option ${
                          selectedTicket?.id === ticket.id
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
                          selectedTicket?.id === ticket.id
                        }
                        onChange={() =>
                          handleTicketChange(ticket.id)
                        }
                      />

                      <span className="ticket-option-description">
                        <strong>
                          {ticket.name}
                        </strong>

                        {ticket.description && (
                          <small>
                            {ticket.description}
                          </small>
                        )}
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
                    onChange={handleQuantityChange}
                    disabled={maximumQuantity < 1}
                  >
                    {Array.from(
                      { length: maximumQuantity },
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
                    value={buyer.name}
                    onChange={handleBuyerChange}
                    minLength={2}
                    maxLength={100}
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
                    value={buyer.email}
                    onChange={handleBuyerChange}
                    maxLength={254}
                    required
                  />
                </label>

                <label className="form-field">
                  Phone number

                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="0712 345 678"
                    autoComplete="tel"
                    value={buyer.phone}
                    onChange={handleBuyerChange}
                    pattern="[+0-9 ()-]{9,20}"
                    maxLength={20}
                    required
                  />
                </label>

                <div className="booking-summary">
                  <div>
                    <span>
                      {selectedTicket?.name}
                      {" × "}
                      {quantity}
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
              </fieldset>

              {formError && (
                <div
                  className="auth-error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              {review?.eventId === event.id && (
                <section
                  className="information-message"
                  aria-live="polite"
                >
                  <h3>Your selection</h3>

                  <p>
                    <strong>Name:</strong>{" "}
                    {review.name}
                    <br />

                    <strong>Event:</strong>{" "}
                    {review.eventTitle}
                    <br />

                    <strong>Ticket:</strong>{" "}
                    {review.ticketName}
                    <br />

                    <strong>Quantity:</strong>{" "}
                    {review.quantity}
                    <br />

                    <strong>Price per ticket:</strong>{" "}
                    {formatMoney(review.unitPrice)}
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
                    Check your details before
                    continuing. Your booking is
                    confirmed only after the server
                    verifies payment.
                  </p>

                  <button
                    type="button"
                    className="button button-dark full-width"
                    onClick={handlePayment}
                    disabled={
                      paymentBusy || !canReview
                    }
                  >
                    {paymentBusy
                      ? "Opening secure checkout…"
                      : "Continue to payment"}
                  </button>
                </section>
              )}

              <p className="checkout-note">
                <ShieldCheck
                  size={16}
                  aria-hidden="true"
                />

                QR tickets are issued after
                verified payment
              </p>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}