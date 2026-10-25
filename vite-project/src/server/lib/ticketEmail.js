import QRCode from "qrcode";

const EMAIL_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 6;
const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600, 21600];
const ACCESS_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function formatNairobiDateTime(value) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function safeSubjectText(value) {
  return Array.from(String(value ?? "EventPass"), (character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("").slice(0, 160);
}

function privateTicketsUrl(appUrl, accessToken) {
  const url = new URL("/tickets", appUrl);
  url.hash = new URLSearchParams({ access: accessToken }).toString();
  return url.toString();
}

export async function buildTicketConfirmationEmail({
  order,
  event,
  tickets,
  appUrl,
  from,
  qrCode = QRCode,
}) {
  if (order.status !== "paid") {
    throw new Error("Only paid orders can receive confirmations.");
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw new Error("No issued tickets are available for this order.");
  }

  if (!ACCESS_TOKEN_PATTERN.test(order.access_token || "")) {
    throw new Error("The private ticket access token is invalid.");
  }

  const testMode = order.payment_domain === "test";
  const eventTitle = String(event.title || "Event");
  const startsAt = formatNairobiDateTime(event.starts_at);
  const endsAt = event.ends_at
    ? formatNairobiDateTime(event.ends_at)
    : null;
  const privateUrl = privateTicketsUrl(appUrl, order.access_token);
  const subject = `${testMode ? "[TEST / NOT FOR LIVE ADMISSION] " : ""}Ticket confirmation: ${safeSubjectText(eventTitle)}`;
  const attachmentFiles = await Promise.all(tickets.map(async (ticket, index) => ({
    filename: `eventpass-ticket-${index + 1}.png`,
    content: (await qrCode.toBuffer(ticket.token, {
      type: "png",
      width: 360,
      margin: 3,
      errorCorrectionLevel: "M",
    })).toString("base64"),
  })));

  const testNotice = testMode
    ? "TEST PAYMENT — NOT FOR LIVE ADMISSION. These tickets are for testing only."
    : "Your payment was verified and your tickets are ready.";

  const ticketRows = tickets.map((ticket, index) => `
    <li>
      <strong>Ticket ${index + 1}:</strong>
      ${escapeHtml(ticket.ticket_type_name)} — reference
      <code>${escapeHtml(ticket.reference)}</code>
      <span>Its matching QR code is attached as eventpass-ticket-${index + 1}.png.</span>
    </li>`).join("");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f5f1;color:#192b22;font-family:Arial,sans-serif;line-height:1.55">
    <main style="max-width:640px;margin:0 auto;padding:32px 20px">
      <h1 style="font-size:26px">${testMode ? "TEST / NOT FOR LIVE ADMISSION — " : ""}Your tickets are confirmed</h1>
      <p>Hello ${escapeHtml(order.buyer_name)},</p>
      <p>${escapeHtml(testNotice)}</p>
      <h2>${escapeHtml(eventTitle)}</h2>
      <p><strong>Venue:</strong> ${escapeHtml(event.venue)}</p>
      <p><strong>Starts:</strong> ${escapeHtml(startsAt)} (Africa/Nairobi)</p>
      ${endsAt ? `<p><strong>Ends:</strong> ${escapeHtml(endsAt)} (Africa/Nairobi)</p>` : ""}
      <p><strong>Order reference:</strong> ${escapeHtml(order.reference)}<br>
         <strong>Ticket quantity:</strong> ${tickets.length}</p>
      <h2>Your tickets</h2>
      <ul>${ticketRows}
      </ul>
      <p><a href="${escapeHtml(privateUrl)}" style="display:inline-block;padding:12px 18px;background:#192b22;color:#fff;text-decoration:none">View your private tickets</a></p>
      <p>Keep your QR codes and private ticket link confidential. Anyone with them may be able to access or use your tickets.</p>
      ${testMode ? "<p><strong>TEST / NOT FOR LIVE ADMISSION</strong></p>" : ""}
      <p>EventPass</p>
    </main>
  </body>
</html>`;

  const textTicketLines = tickets.map((ticket, index) =>
    `Ticket ${index + 1}: ${ticket.ticket_type_name} — reference ${ticket.reference} (QR attached as eventpass-ticket-${index + 1}.png)`
  ).join("\n");

  const text = [
    `${testMode ? "TEST / NOT FOR LIVE ADMISSION — " : ""}Your tickets are confirmed`,
    "",
    `Hello ${order.buyer_name},`,
    "",
    testNotice,
    "",
    `Event: ${eventTitle}`,
    `Venue: ${event.venue}`,
    `Starts: ${startsAt} (Africa/Nairobi)`,
    ...(endsAt ? [`Ends: ${endsAt} (Africa/Nairobi)`] : []),
    `Order reference: ${order.reference}`,
    `Ticket quantity: ${tickets.length}`,
    "",
    "Your tickets:",
    textTicketLines,
    "",
    `Private ticket link: ${privateUrl}`,
    "Keep your QR codes and private ticket link confidential. Anyone with them may be able to access or use your tickets.",
    ...(testMode ? ["", "TEST / NOT FOR LIVE ADMISSION."] : []),
    "",
    "EventPass",
  ].join("\n");

  return {
    from,
    to: [order.buyer_email],
    subject,
    html,
    text,
    attachments: attachmentFiles,
  };
}

function retryDelaySeconds(attemptCount) {
  return RETRY_DELAYS_SECONDS[
    Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_SECONDS.length - 1)
  ];
}

async function sendWithResend({ apiKey, idempotencyKey, email, fetchImpl }) {
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(email),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Resend returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok || typeof result.id !== "string" || !result.id) {
    throw new Error(`Resend did not accept the email (HTTP ${response.status}).`);
  }

  return result.id;
}

export function createTicketEmailService({
  store,
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.EMAIL_FROM,
  appUrl = process.env.APP_URL,
  fetchImpl = globalThis.fetch,
  qrCode = QRCode,
}) {
  async function deliverClaim(claim) {
    try {
      if (!apiKey || !from || !appUrl) {
        throw new Error("Email delivery is not configured.");
      }

      const { order, event, tickets } = await store.loadPaidOrder(claim.order_id);
      if (order.status !== "paid" || !tickets.length) {
        throw new Error("Paid order tickets are not available yet.");
      }

      const email = await buildTicketConfirmationEmail({
        order,
        event,
        tickets,
        appUrl,
        from,
        qrCode,
      });

      const providerId = await sendWithResend({
        apiKey,
        idempotencyKey: `eventpass-ticket-confirmation-${order.id}-${claim.generation}`,
        email,
        fetchImpl,
      });

      await store.finish({
        orderId: claim.order_id,
        generation: claim.generation,
        providerId,
        error: null,
        retryAfterSeconds: null,
      });

      return { accepted: true, providerId };
    } catch (error) {
      const attemptCount = Number(claim.attempt_count) || 1;
      const safeError = error.message === "Email delivery is not configured."
        ? "Email provider configuration is missing."
        : error.message === "Paid order tickets are not available yet."
          ? error.message
          : error.message === "The email provider did not accept the email (HTTP 503)."
            ? "Email provider returned a temporary failure."
            : "Email delivery attempt failed.";

      await store.finish({
        orderId: claim.order_id,
        generation: claim.generation,
        providerId: null,
        error: safeError,
        retryAfterSeconds: attemptCount >= MAX_RETRIES
          ? null
          : retryDelaySeconds(attemptCount),
      });

      return { accepted: false, reason: safeError };
    }
  }

  async function sendForOrder(orderId) {
    const claim = await store.claim(orderId);
    if (!claim) return { accepted: false, reason: "not_due" };
    return deliverClaim(claim);
  }

  async function requestManual(orderId) {
    const claim = await store.requestManual(orderId);
    if (!claim || claim.order_id !== orderId) {
      return { accepted: false, reason: "already_processing" };
    }

    return deliverClaim(claim);
  }

  async function processDue(limit = 25) {
    let accepted = 0;
    let failed = 0;

    for (let index = 0; index < limit; index += 1) {
      const claim = await store.claim(null);
      if (!claim) break;

      const result = await deliverClaim(claim);
      if (result.accepted) accepted += 1;
      else failed += 1;
    }

    return { accepted, failed };
  }

  return { sendForOrder, requestManual, processDue };
}

export async function requestConfirmationForAccess({
  accessToken,
  findOrderByAccess,
  emailService,
}) {
  if (typeof accessToken !== "string" || !ACCESS_TOKEN_PATTERN.test(accessToken)) {
    const error = new Error("Booking access was not found.");
    error.status = 404;
    throw error;
  }

  const order = await findOrderByAccess(accessToken);
  if (order.status !== "paid") {
    const error = new Error("Confirmation email is available only for paid orders.");
    error.status = 409;
    throw error;
  }

  return emailService.requestManual(order.id);
}
