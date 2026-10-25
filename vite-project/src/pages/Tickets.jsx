import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";

import {
  fetchOrderTickets,
  getStoredOrderAccess,
  requestConfirmationEmail,
  verifyOrder,
} from "../lib/payments.js";

import {
  formatDate,
  formatMoney,
  formatTime,
} from "../data/event.js";

export default function Tickets() {
  const location = useLocation();

  const params = new URLSearchParams(
    location.search
  );

  const reference =
    params.get("reference") ||
    params.get("trxref");

  const fragment = new URLSearchParams(
    location.hash.slice(1)
  );

  const accessToken =
    fragment.get("access") ||
    (
      reference
        ? getStoredOrderAccess(reference)
        : null
    );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!accessToken) {
        throw new Error(
          "Booking access was not found. Return using the same browser and address used for checkout."
        );
      }

      const result = reference
        ? await verifyOrder(
            reference,
            accessToken
          )
        : await fetchOrderTickets(
            accessToken
          );

      setData(result);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not retrieve your tickets."
      );
    } finally {
      setLoading(false);
    }
  }, [reference, accessToken]);

  async function handleSendConfirmation() {
    setEmailBusy(true);
    setEmailMessage("");
    setEmailError("");

    try {
      const result = await requestConfirmationEmail(accessToken);
      if (!result.accepted) {
        throw new Error("The email provider did not accept the request.");
      }

      setEmailMessage(
        "The email provider accepted your request. Delivery to your inbox is not confirmed."
      );
    } catch (requestError) {
      setEmailError(
        requestError.message ||
          "Could not request a confirmation email. Your tickets remain available here."
      );
    } finally {
      setEmailBusy(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  if (loading) {
    return (
      <main className="container page-section">
        <div
          className="empty-state"
          role="status"
        >
          <h2>Checking your booking…</h2>

          <p>
            Verifying payment and retrieving tickets.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container page-section">
        <h1>Let’s check your booking.</h1>

        <div
          className="auth-error"
          role="alert"
        >
          {error}
        </div>

        {reference && (
          <p>
            Booking reference:{" "}
            <strong>{reference}</strong>
          </p>
        )}

        <div className="event-actions">
          <button
            type="button"
            className="button button-dark"
            onClick={loadTickets}
          >
            Check again
          </button>

          <Link
            to="/"
            className="button"
          >
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="container page-section tickets-page">
      <span className="eyebrow">
        <CheckCircle2 size={17} />
        PAYMENT VERIFIED
      </span>

      <h1>
        {data.testMode
          ? "Test booking confirmed."
          : "You’re going."}
      </h1>

      {data.testMode && (
        <div className="information-message">
          <strong>TEST PAYMENT.</strong>{" "}
          These tickets are for testing and are
          not valid for live admission.
        </div>
      )}

      <p>
        {data.tickets.length}{" "}
        {data.tickets.length === 1
          ? "ticket"
          : "tickets"}
        {" · "}
        {formatMoney(data.amount / 100)}
      </p>

      <p className="ticket-privacy-note">
        Keep these QR codes private. Each represents
        a separate ticket.
      </p>

      <div className="event-actions ticket-page-actions">
        <button
          type="button"
          className="button button-dark"
          onClick={handleSendConfirmation}
          disabled={emailBusy}
        >
          {emailBusy ? "Requesting email…" : "Send confirmation email"}
        </button>

        <button
          type="button"
          className="button button-dark"
          onClick={() => window.print()}
        >
          <Printer size={17} />
          Print / save PDF
        </button>

        <Link
          to="/"
          className="button"
        >
          Browse events
        </Link>
      </div>

      {emailMessage && (
        <p className="information-message" role="status" aria-live="polite">
          {emailMessage}
        </p>
      )}

      {emailError && (
        <p className="auth-error" role="alert">
          {emailError}
        </p>
      )}

      {data.tickets.map((ticket) => (
        <article
          key={ticket.id}
          className="admission-ticket"
        >
          <div className="admission-ticket-details">
            <span className="eyebrow">
              EVENTPASS / ADMIT ONE
            </span>

            <h2>{data.event.title}</h2>

            <p>
              {formatDate(
                data.event.starts_at
              )}
              <br />

              {formatTime(
                data.event.starts_at
              )}
              {" EAT"}
            </p>

            <p>{data.event.venue}</p>

            <strong>
              {ticket.ticketType}
            </strong>

            <p className="ticket-code">
              {ticket.reference}
            </p>

            {data.testMode && (
              <strong>
                TEST TICKET
              </strong>
            )}
          </div>

          <div className="ticket-qr">
            <img
              src={ticket.qr}
              alt={
                `QR ticket ${ticket.reference}`
              }
              width="200"
              height="200"
            />

            <a
              href={ticket.qr}
              download={
                `${ticket.reference}.png`
              }
              className="back-link"
            >
              <Download size={16} />
              Save QR image
            </a>
          </div>
        </article>
      ))}

      <p className="ticket-privacy-note">
        Keep the private ticket link and QR codes confidential.
      </p>
    </main>
  );
}