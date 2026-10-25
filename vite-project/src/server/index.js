import express from "express";
import helmet from "helmet";

import {
  rateLimit,
} from "express-rate-limit";

import {
  createClient,
} from "@supabase/supabase-js";

import { z } from "zod";

import crypto from "node:crypto";
import path from "node:path";

import {
  fileURLToPath,
} from "node:url";

import QRCode from "qrcode";
import {
  createTicketEmailService,
  requestConfirmationForAccess,
} from "./lib/ticketEmail.js";
import { createTicketEmailStore } from "./lib/ticketEmailStore.js";

const requiredVariables = [
  "APP_URL",
  "SUPABASE_SECRET_KEY",
  "PAYSTACK_SECRET_KEY",
];

for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(
      `Missing ${name} in the backend .env file.`
    );
  }
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL (or VITE_SUPABASE_URL) in the backend .env file."
  );
}

const APP_URL = process.env.APP_URL.replace(
  /\/$/,
  ""
);

const APP_ORIGIN = new URL(APP_URL).origin;

const PAYMENT_DOMAIN =
  process.env.PAYSTACK_SECRET_KEY.startsWith(
    "sk_test_"
  )
    ? "test"
    : process.env.PAYSTACK_SECRET_KEY.startsWith(
          "sk_live_"
        )
      ? "live"
      : null;

if (!PAYMENT_DOMAIN) {
  throw new Error(
    "PAYSTACK_SECRET_KEY must be a valid test or live secret key."
  );
}

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const ticketEmailService = createTicketEmailService({
  store: createTicketEmailStore(supabase),
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  appUrl: APP_URL,
});

const app = express();

app.disable("x-powered-by");

const trustedProxies = Number(
  process.env.TRUST_PROXY || 0
);

if (trustedProxies > 0) {
  app.set("trust proxy", trustedProxies);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
        ],

        connectSrc: [
          "'self'",
          supabaseUrl,
        ],

        mediaSrc: [
          "'self'",
          "blob:",
        ],

        workerSrc: [
          "'self'",
          "blob:",
        ],

        upgradeInsecureRequests:
          process.env.NODE_ENV === "production"
            ? []
            : null,
      },
    },
  })
);

app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

function httpError(message, status = 400) {
  return Object.assign(
    new Error(message),
    { status }
  );
}

function checked(result) {
  if (result.error) {
    throw httpError(result.error.message);
  }

  return result.data;
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(
      handler(request, response, next)
    ).catch(next);
  };
}

const accessTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/);

const referenceSchema = z
  .string()
  .regex(/^ep_[a-f0-9]{32}$/);

async function callPaystack(endpoint, body) {
  const response = await fetch(
    `https://api.paystack.co${endpoint}`,
    {
      method: body ? "POST" : "GET",

      headers: {
        Authorization:
          `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

        "Content-Type": "application/json",
      },

      ...(body
        ? { body: JSON.stringify(body) }
        : {}),

      signal: AbortSignal.timeout(20000),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw httpError(
      "The payment provider could not complete this request. Please try again.",
      502
    );
  }

  return result.data;
}

async function findOrderByAccess(accessToken) {
  accessTokenSchema.parse(accessToken);

  const order = checked(
    await supabase
      .from("orders")
      .select("*")
      .eq("access_token", accessToken)
      .maybeSingle()
  );

  if (!order) {
    throw httpError(
      "Booking not found.",
      404
    );
  }

  return order;
}

async function verifyAndConfirm(order) {
  if (
    order.status === "paid" ||
    order.status === "review" ||
    order.status === "voided"
  ) {
    if (order.status === "paid") {
      await sendConfirmationSafely(order.id);
    }

    return order;
  }

  const payment = await callPaystack(
    `/transaction/verify/${encodeURIComponent(
      order.reference
    )}`
  );

  const matches =
    payment.status === "success" &&
    payment.reference === order.reference &&
    payment.currency === "KES" &&
    Number.isSafeInteger(payment.amount) &&
    payment.amount === order.amount &&
    payment.domain === order.payment_domain &&
    payment.domain === PAYMENT_DOMAIN &&
    payment.id != null;

  if (!matches) {
    throw httpError(
      "Payment is not verified yet, or its details do not match the booking. Wait a moment and check again.",
      409
    );
  }

  const confirmed = checked(
    await supabase.rpc(
      "confirm_ticket_order",
      {
        p_reference: order.reference,
        p_provider: String(payment.id),
      }
    )
  );

  if (confirmed?.status === "paid") {
    await sendConfirmationSafely(order.id);
  }

  return confirmed;
}

async function buildTicketResponse(order) {
  if (order.status === "review") {
    throw httpError(
      `Payment received, but this booking needs organizer review. No tickets were issued. Keep this reference: ${order.reference}`,
      409
    );
  }

  if (order.status === "voided") {
    throw httpError(
      "This order has been voided. Contact the organizer.",
      409
    );
  }

  if (order.status !== "paid") {
    throw httpError(
      "Payment has not been confirmed.",
      409
    );
  }

  const event = checked(
    await supabase
      .from("events")
      .select(
        "title, venue, starts_at, ends_at"
      )
      .eq("id", order.event_id)
      .single()
  );

  const tickets = checked(
    await supabase
      .from("tickets")
      .select(
        "id, reference, token, ticket_type_name, checked_in_at"
      )
      .eq("order_id", order.id)
      .order("reference")
  );

  const ticketImages = await Promise.all(
    tickets.map(async (ticket) => ({
      id: ticket.id,
      reference: ticket.reference,
      ticketType: ticket.ticket_type_name,
      checkedInAt: ticket.checked_in_at,

      qr: await QRCode.toDataURL(
        ticket.token,
        {
          width: 360,
          margin: 3,
          errorCorrectionLevel: "M",
        }
      ),
    }))
  );

  return {
    event,
    reference: order.reference,
    amount: order.amount,
    testMode:
      order.payment_domain === "test",
    tickets: ticketImages,
  };
}

// Webhooks need the untouched raw request body.
app.post(
  "/api/webhooks/paystack",

  express.raw({
    type: "application/json",
    limit: "128kb",
  }),

  asyncRoute(async (request, response) => {
    const signature = request.get(
      "x-paystack-signature"
    );

    if (
      !Buffer.isBuffer(request.body) ||
      !/^[a-f0-9]{128}$/i.test(
        signature || ""
      )
    ) {
      return response
        .status(401)
        .json({
          error: "Invalid webhook signature.",
        });
    }

    const expected = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(request.body)
      .digest();

    const supplied = Buffer.from(
      signature,
      "hex"
    );

    if (
      !crypto.timingSafeEqual(
        expected,
        supplied
      )
    ) {
      return response
        .status(401)
        .json({
          error: "Invalid webhook signature.",
        });
    }

    const payload = JSON.parse(
      request.body.toString("utf8")
    );

    if (payload.event === "charge.success") {
      const parsedReference =
        referenceSchema.safeParse(
          payload.data?.reference
        );

      if (parsedReference.success) {
        const order = checked(
          await supabase
            .from("orders")
            .select("*")
            .eq(
              "reference",
              parsedReference.data
            )
            .maybeSingle()
        );

        if (order) {
          await verifyAndConfirm(order);
        }
      }
    }

    response.sendStatus(200);
  })
);

app.use(
  express.json({
    limit: "32kb",
  })
);

app.use(
  "/api",

  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
      error:
        "Too many requests. Please wait a minute.",
    },
  })
);

// Browser write requests must originate
// from the configured frontend.
app.use("/api", (request, response, next) => {
  const origin = request.get("origin");

  const isWrite = [
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
  ].includes(request.method);

  if (
    isWrite &&
    origin &&
    origin !== APP_ORIGIN
  ) {
    return response
      .status(403)
      .json({
        error: "Origin not allowed.",
      });
  }

  next();
});

app.get(
  "/api/health",
  (_request, response) => {
    response.json({
      ok: true,
      paymentMode: PAYMENT_DOMAIN,
    });
  }
);

const confirmationRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many email requests. Please wait before trying again.",
  },
});

app.post(
  "/api/orders/confirmation-email",
  confirmationRequestLimiter,
  asyncRoute(async (request, response) => {
    const input = z.object({
      accessToken: accessTokenSchema,
    }).parse(request.body);

    const result = await requestConfirmationForAccess({
      accessToken: input.accessToken,
      findOrderByAccess,
      emailService: ticketEmailService,
    });

    if (!result.accepted) {
      const status = result.reason === "not_due" ? 429 : 503;
      return response.status(status).json({
        accepted: false,
        error: result.reason === "not_due"
          ? "Please wait before requesting another confirmation email."
          : "The email provider did not accept the confirmation. Your tickets remain available here.",
      });
    }

    response.json({
      accepted: true,
      message: "The email provider accepted the confirmation request. Inbox delivery is not confirmed.",
    });
  })
);

app.post(
  "/api/internal/ticket-confirmations/retry",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  asyncRoute(async (request, response) => {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.get("authorization") || "";
    if (!cronSecret || !authorization.startsWith("Bearer ")) {
      throw httpError("Not found.", 404);
    }

    const supplied = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(cronSecret);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw httpError("Not found.", 404);
    }

    const result = await ticketEmailService.processDue(5);
    response.json({ ok: true, ...result });
  })
);

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    error:
      "Too many checkout attempts. Please try again later.",
  },
});

app.post(
  "/api/checkout",

  checkoutLimiter,

  asyncRoute(async (request, response) => {
    const input = z
      .object({
        eventId: z.string().uuid(),

        ticketTypeId:
          z.string().uuid(),

        quantity: z
          .number()
          .int()
          .min(1)
          .max(10),

        name: z
          .string()
          .trim()
          .min(2)
          .max(100),

        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((value) =>
            value.toLowerCase()
          ),

        phone: z
          .string()
          .trim()
          .regex(
            /^[+0-9 ()-]{9,20}$/
          ),
      })
      .parse(request.body);

    const reference =
      "ep_" +
      crypto
        .randomBytes(16)
        .toString("hex");

    const accessToken = crypto
      .randomBytes(32)
      .toString("hex");

    const order = checked(
      await supabase.rpc(
        "reserve_ticket_order",
        {
          p_event: input.eventId,
          p_type: input.ticketTypeId,
          p_quantity: input.quantity,

          p_name: input.name,
          p_email: input.email,
          p_phone: input.phone,

          p_reference: reference,
          p_access: accessToken,
          p_domain: PAYMENT_DOMAIN,
        }
      )
    );

    // The amount comes from the database,
    // never from the browser.
    const payment = await callPaystack(
      "/transaction/initialize",
      {
        email: order.buyer_email,
        amount: order.amount,
        currency: "KES",
        reference: order.reference,

        callback_url:
          `${APP_URL}/checkout/return`,

        metadata: {
          order_id: order.id,
        },
      }
    );

    response.json({
      url: payment.authorization_url,
      reference,
      accessToken,
    });
  })
);

app.post(
  "/api/orders/verify",

  asyncRoute(async (request, response) => {
    const input = z
      .object({
        reference: referenceSchema,
        accessToken: accessTokenSchema,
      })
      .parse(request.body);

    const order = await findOrderByAccess(
      input.accessToken
    );

    if (
      order.reference !== input.reference
    ) {
      throw httpError(
        "Booking reference does not match.",
        403
      );
    }

    const confirmed =
      await verifyAndConfirm(order);

    response.json(
      await buildTicketResponse(confirmed)
    );
  })
);

app.post(
  "/api/orders/tickets",

  asyncRoute(async (request, response) => {
    const input = z
      .object({
        accessToken: accessTokenSchema,
      })
      .parse(request.body);

    const order = await findOrderByAccess(
      input.accessToken
    );

    response.json(
      await buildTicketResponse(order)
    );
  })
);

app.use(
  "/api",
  (_request, response) => {
    response.status(404).json({
      error: "API route not found.",
    });
  }
);

// Serve the built React app when deployed
// as one Node web service.
const projectRoot = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  ".."
);

app.use(
  express.static(
    path.join(projectRoot, "dist")
  )
);

app.get(
  "/{*splat}",
  (_request, response) => {
    response.sendFile(
      path.join(
        projectRoot,
        "dist",
        "index.html"
      )
    );
  }
);

app.use(
  (error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error instanceof z.ZodError) {
      return response.status(400).json({
        error: error.issues
          .map(
            (issue) =>
              `${issue.path.join(".")}: ${issue.message}`
          )
          .join("; "),
      });
    }

    const status = error.status || 500;

    if (status >= 500) {
      console.error(
        "Payment request failed:",
        error.name
      );
    }

    response.status(status).json({
      error:
        status >= 500
          ? "The service could not complete this request. Please try again."
          : status === 429
            ? "Please wait before requesting another confirmation email."
            : status === 409
              ? "A confirmation request is already in progress or unavailable for this order."
              : error.message,
    });
  }
);

const port = Number(
  process.env.PORT || 3001
);

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `EventPass backend running on port ${port}`
    );

    console.log(
      `Payment mode: ${PAYMENT_DOMAIN}`
    );
  }
);

async function sendConfirmationSafely(orderId) {
  try {
    return await ticketEmailService.sendForOrder(orderId);
  } catch {
    // Payment confirmation must not fail because email delivery is unavailable.
    console.error("Ticket confirmation email processing failed.");
    return { accepted: false, reason: "processing_failed" };
  }
}