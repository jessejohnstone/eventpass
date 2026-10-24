import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { createOrganizerEvent } from "../lib/events";

const eventCategories = [
  "Music",
  "Technology",
  "Arts & Culture",
  "Outdoors",
  "Business",
  "Other",
];

function newTicket() {
  return {
    key: crypto.randomUUID(),
    name: "Regular",
    price: "500",
    quantity: "100",
    description: "General admission.",
  };
}

export default function CreateEventForm({
  onCreated,
  onCancel,
}) {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([
    newTicket(),
  ]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const savedName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  function updateTicket(key, field, value) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.key === key
          ? { ...ticket, [field]: value }
          : ticket
      )
    );

    setError("");
  }

  function addTicket() {
    setTickets((current) => [
      ...current,
      {
        ...newTicket(),
        name: "VIP",
        price: "1500",
        quantity: "20",
      },
    ]);
  }

  function removeTicket(key) {
    setTickets((current) =>
      current.filter(
        (ticket) => ticket.key !== key
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const capacity = Number(form.get("capacity"));

      const ticketTypes = tickets.map((ticket) => {
        const price = Number(ticket.price);
        const quantity = Number(ticket.quantity);

        if (
          !Number.isFinite(price) ||
          price < 1 ||
          price > 1000000
        ) {
          throw new Error(
            "Ticket prices must be between KSh 1 and KSh 1,000,000."
          );
        }

        if (
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 100000
        ) {
          throw new Error(
            "Enter a valid quantity for every ticket category."
          );
        }

        return {
          name: ticket.name.trim(),
          description: ticket.description.trim(),

          // KSh → database minor units.
          price: Math.round(price * 100),

          quantity,
        };
      });

      const allocatedTickets = ticketTypes.reduce(
        (sum, ticket) => sum + ticket.quantity,
        0
      );

      if (allocatedTickets > capacity) {
        throw new Error(
          "The total ticket quantity cannot exceed venue capacity."
        );
      }

      // Explicit UTC+3 prevents the browser's timezone
      // from changing the entered event time.
      const startsAt = new Date(
        `${form.get("startsAt")}+03:00`
      );

      const endsAt = new Date(
        `${form.get("endsAt")}+03:00`
      );

      if (
        !Number.isFinite(startsAt.getTime()) ||
        !Number.isFinite(endsAt.getTime())
      ) {
        throw new Error(
          "Enter valid start and end times."
        );
      }

      if (startsAt.getTime() <= Date.now()) {
        throw new Error(
          "Choose a start time in the future."
        );
      }

      if (endsAt <= startsAt) {
        throw new Error(
          "The event must end after it starts."
        );
      }

      const eventDetails = {
        title: String(form.get("title")).trim(),

        organizer_name: String(
          form.get("organizer")
        ).trim(),

        description: String(
          form.get("description")
        ).trim(),

        category: String(form.get("category")),
        city: String(form.get("city")).trim(),
        venue: String(form.get("venue")).trim(),

        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),

        capacity,
        theme: String(form.get("theme")),

        highlights: String(
          form.get("highlights") || ""
        )
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };

      setBusy(true);

      const eventId = await createOrganizerEvent(
        eventDetails,
        ticketTypes
      );

      onCreated(eventId);
    } catch (submitError) {
      setError(
        submitError.message ||
          "Could not save the event."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="organizer-account-card">
      <h2>Create your event</h2>

      <p>
        Save a draft, review the event, then publish
        it from your dashboard.
      </p>

      <form onSubmit={handleSubmit}>
        <fieldset
          disabled={busy}
          className="event-form-fieldset"
        >
          <div className="event-form-grid">
            <label className="form-field">
              Event name
              <input
                name="title"
                minLength={3}
                maxLength={120}
                required
              />
            </label>

            <label className="form-field">
              Organizer or organization
              <input
                name="organizer"
                defaultValue={savedName}
                minLength={2}
                maxLength={100}
                required
              />
            </label>

            <label className="form-field">
              Category
              <select name="category">
                {eventCategories.map((category) => (
                  <option key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              City
              <input
                name="city"
                minLength={2}
                maxLength={80}
                placeholder="Meru"
                required
              />
            </label>

            <label className="form-field">
              Venue
              <input
                name="venue"
                minLength={2}
                maxLength={160}
                required
              />
            </label>

            <label className="form-field">
              Venue capacity
              <input
                name="capacity"
                type="number"
                defaultValue={100}
                min={1}
                max={100000}
                required
              />
            </label>

            <label className="form-field">
              Start date and time — EAT
              <input
                name="startsAt"
                type="datetime-local"
                required
              />
            </label>

            <label className="form-field">
              End date and time — EAT
              <input
                name="endsAt"
                type="datetime-local"
                required
              />
            </label>

            <label className="form-field">
              Poster style
              <select name="theme">
                <option value="sunset">
                  Sunset sessions
                </option>

                <option value="tech">
                  Technology
                </option>

                <option value="art">
                  Arts and creativity
                </option>

                <option value="forest">
                  Outdoors
                </option>
              </select>
            </label>
          </div>

          <label className="form-field">
            Description
            <textarea
              name="description"
              minLength={20}
              maxLength={5000}
              rows={5}
              required
            />
          </label>

          <label className="form-field">
            Highlights — one per line
            <textarea
              name="highlights"
              rows={3}
              maxLength={2000}
              placeholder={
                "Live performances\nNetworking\nFood vendors"
              }
            />
          </label>

          <h3>Ticket categories</h3>

          {tickets.map((ticket, index) => (
            <div
              className="ticket-editor"
              key={ticket.key}
            >
              <h3>Category {index + 1}</h3>

              <div className="event-form-grid">
                <label className="form-field">
                  Name
                  <input
                    value={ticket.name}
                    onChange={(event) =>
                      updateTicket(
                        ticket.key,
                        "name",
                        event.target.value
                      )
                    }
                    maxLength={60}
                    required
                  />
                </label>

                <label className="form-field">
                  Price — KSh
                  <input
                    type="number"
                    value={ticket.price}
                    onChange={(event) =>
                      updateTicket(
                        ticket.key,
                        "price",
                        event.target.value
                      )
                    }
                    min={1}
                    max={1000000}
                    step="0.01"
                    required
                  />
                </label>

                <label className="form-field">
                  Tickets available
                  <input
                    type="number"
                    value={ticket.quantity}
                    onChange={(event) =>
                      updateTicket(
                        ticket.key,
                        "quantity",
                        event.target.value
                      )
                    }
                    min={1}
                    max={100000}
                    required
                  />
                </label>

                <label className="form-field">
                  Ticket description
                  <input
                    value={ticket.description}
                    onChange={(event) =>
                      updateTicket(
                        ticket.key,
                        "description",
                        event.target.value
                      )
                    }
                    maxLength={300}
                  />
                </label>
              </div>

              {tickets.length > 1 && (
                <button
                  type="button"
                  className="button button-small"
                  onClick={() =>
                    removeTicket(ticket.key)
                  }
                >
                  <Trash2 size={15} />
                  Remove category
                </button>
              )}
            </div>
          ))}

          <div className="event-actions">
            <button
              type="button"
              className="button"
              onClick={addTicket}
              disabled={tickets.length >= 6}
            >
              <Plus size={16} />
              Add category
            </button>
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="event-actions">
            <button
              type="submit"
              className="button button-dark"
            >
              {busy ? "Saving…" : "Save draft"}
            </button>

            <button
              type="button"
              className="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}