import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  LogOut,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import {
  getOrganizerEvents,
  setEventPublished,
} from "../lib/events";

import {
  formatDate,
  formatMoney,
} from "../data/event .js";

import CreateEventForm from "../components/CreateEventForm";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [busyEventId, setBusyEventId] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const rawName =
    user?.user_metadata?.full_name;

  const organizerName =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : user?.email?.split("@")[0] || "Organizer";

  const loadEvents = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      const result = await getOrganizerEvents(
        user.id
      );

      setEvents(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handlePublish(event) {
    setBusyEventId(event.id);
    setError("");
    setMessage("");

    try {
      await setEventPublished(
        event.id,
        !event.published
      );

      setEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                published: !item.published,
              }
            : item
        )
      );

      setMessage(
        event.published
          ? "Event unpublished. It is now a private draft."
          : "Event published. It now appears on the homepage."
      );
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setBusyEventId("");
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    setError("");

    try {
      const { error: logoutError } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (logoutError) throw logoutError;

      navigate("/organizer/login", {
        replace: true,
      });
    } catch (logoutError) {
      setError(logoutError.message);
    } finally {
      setSigningOut(false);
    }
  }

  function handleCreated() {
    setCreating(false);

    setMessage(
      "Draft saved. Review it, then click Publish."
    );

    loadEvents();
  }

  return (
    <main className="container page-section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            YOUR ORGANIZER WORKSPACE
          </span>

          <h1>Welcome, {organizerName}.</h1>

          <p>Create and manage your events.</p>
        </div>

        <div className="event-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              setCreating(true);
              setError("");
              setMessage("");
            }}
          >
            <Plus size={17} />
            Create event
          </button>

          <button
            type="button"
            className="button button-dark"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut size={17} />

            {signingOut
              ? "Signing out…"
              : "Sign out"}
          </button>
        </div>
      </div>

      <details className="organizer-account-card account-summary">
        <summary>Your account details</summary>

        <dl className="account-details">
          <div>
            <dt>Name</dt>
            <dd>{organizerName}</dd>
          </div>

          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>

          <div>
            <dt>Phone number</dt>

            <dd>
              {user?.user_metadata?.phone_number ||
                "Not provided"}
            </dd>
          </div>
        </dl>
      </details>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div
          className="information-message"
          role="status"
        >
          {message}
        </div>
      )}

      {creating ? (
        <CreateEventForm
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <>
          <div className="dashboard-heading">
            <h2>Your events</h2>

            <button
              type="button"
              className="button button-small"
              onClick={loadEvents}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div
              className="empty-state"
              role="status"
            >
              Loading your events…
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <h2>Your first event belongs here.</h2>

              <p>
                Click Create event to get started.
              </p>
            </div>
          ) : (
            <div className="organizer-event-list">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="organizer-account-card"
                >
                  <span
                    className={
                      event.published
                        ? "event-status published"
                        : "event-status"
                    }
                  >
                    {event.published
                      ? "Published"
                      : "Draft"}
                  </span>

                  <h2>{event.title}</h2>

                  <p>
                    {formatDate(event.startsAt)}
                    {" · "}
                    {event.venue}
                  </p>

                  <p>
                    Capacity: {event.capacity} people
                  </p>

                  {event.ticketTypes.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="event-ticket-row"
                    >
                      <span>
                        {ticket.name}
                        {" · "}
                        {ticket.quantity} allocated
                      </span>

                      <strong>
                        {formatMoney(ticket.price)}
                      </strong>
                    </div>
                  ))}

                  <div className="event-actions">
                    <Link
                      to={`/events/${event.id}`}
                      className="button"
                    >
                      View event
                    </Link>

                    <button
                      type="button"
                      className="button button-dark"
                      onClick={() =>
                        handlePublish(event)
                      }
                      disabled={
                        busyEventId === event.id
                      }
                    >
                      {busyEventId === event.id
                        ? "Saving…"
                        : event.published
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}