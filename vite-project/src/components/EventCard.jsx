import { Link } from "react-router-dom";

import {
  ArrowUpRight,
  MapPin,
} from "lucide-react";

import { formatMoney } from "../data/event .js";

export function EventPoster({
  event,
  large = false,
}) {
  return (
    <div
      className={[
        "event-poster",
        event.theme,
        large ? "poster-large" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="poster-label">
        {event.category} / {event.city}
      </span>

      <div
        className="poster-decoration"
        aria-hidden="true"
      />

      <strong className="poster-words">
        {event.posterLines[0]}
        <br />
        {event.posterLines[1]}
      </strong>

      <span className="poster-caption">
        A LITTLE LESS SCROLLING.
        A LITTLE MORE LIVING.
      </span>
    </div>
  );
}

export default function EventCard({ event }) {
  const date = new Date(event.startsAt);

  const month = date.toLocaleDateString("en", {
    month: "short",
    timeZone: "Africa/Nairobi",
  });

  const day = date.toLocaleDateString("en", {
    day: "2-digit",
    timeZone: "Africa/Nairobi",
  });

  const startingPrice = Math.min(
    ...event.ticketTypes.map(
      (ticket) => ticket.price
    )
  );

  return (
    <Link
      to={`/events/${event.id}`}
      className="event-card"
    >
      <div className="event-card-image">
        <EventPoster event={event} />

        <span className="category-badge">
          {event.category}
        </span>
      </div>

      <div className="event-card-content">
        <div className="event-date">
          <span>{month}</span>
          <strong>{day}</strong>
        </div>

        <div className="event-card-info">
          <h3>{event.title}</h3>

          <p>
            <MapPin size={14} />
            {event.venue}
          </p>

          <strong className="event-price">
            From {formatMoney(startingPrice)}
          </strong>
        </div>

        <ArrowUpRight size={19} />
      </div>
    </Link>
  );
}