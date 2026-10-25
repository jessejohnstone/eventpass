import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTicketConfirmationEmail,
  createTicketEmailService,
  requestConfirmationForAccess,
} from "./ticketEmail.js";

const accessToken = "a".repeat(64);
const paidOrder = {
  id: "order-uuid",
  status: "paid",
  payment_domain: "test",
  buyer_name: "Ada <script>alert(1)</script>",
  buyer_email: "ada@example.test",
  reference: "ep_0123456789abcdef0123456789abcdef",
  access_token: accessToken,
};
const event = {
  title: "A <Great> Event",
  venue: "Nairobi & Friends",
  starts_at: "2026-12-19T15:00:00+03:00",
  ends_at: "2026-12-19T18:00:00+03:00",
};
const tickets = [
  { reference: "TICKET-001", token: "qr-token-one", ticket_type_name: "Early <Bird>" },
  { reference: "TICKET-002", token: "qr-token-two", ticket_type_name: "VIP & Guest" },
];

function makeStore({ failFirst = false, delayMs = 0 } = {}) {
  const state = {
    generation: 1,
    status: "pending",
    attempts: 0,
    lock: false,
    calls: 0,
    finished: [],
    manualAt: 0,
    failFirst,
  };

  return {
    state,
    async claim(orderId) {
      if (orderId && orderId !== paidOrder.id) return null;
      if (state.lock || state.status === "accepted" || state.attempts >= 6) return null;
      state.lock = true;
      state.status = "processing";
      state.attempts += 1;
      return {
        order_id: paidOrder.id,
        generation: state.generation,
        attempt_count: state.attempts,
      };
    },
    async loadPaidOrder() {
      return { order: paidOrder, event, tickets };
    },
    async finish(result) {
      state.finished.push(result);
      state.lock = false;
      state.status = result.providerId ? "accepted" : "failed";
    },
    async requestManual(orderId) {
      assert.equal(orderId, paidOrder.id);
      if (state.manualAt) {
        const error = new Error("cooldown");
        error.status = 429;
        throw error;
      }
      state.manualAt = Date.now();
      state.generation += 1;
      state.attempts = 0;
      state.status = "pending";
      state.lock = true;
      state.status = "processing";
      state.attempts = 1;
      return {
        order_id: paidOrder.id,
        generation: state.generation,
        attempt_count: state.attempts,
      };
    },
    async pause() {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    },
  };
}

function mockFetch({ failCount = 0, delayMs = 0 } = {}) {
  const calls = [];
  let failuresLeft = failCount;
  const fetchImpl = async (_url, options) => {
    calls.push(options);
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      return { ok: false, status: 503, json: async () => ({ error: "temporary" }) };
    }
    return { ok: true, status: 200, json: async () => ({ id: "resend-accepted-id" }) };
  };
  return { calls, fetchImpl };
}

const fakeQr = {
  async toBuffer(token) {
    return Buffer.from(`png:${token}`);
  },
};

test("paid multi-ticket email includes escaped details, Nairobi times, private link and one QR attachment per ticket", async () => {
  const email = await buildTicketConfirmationEmail({
    order: paidOrder,
    event,
    tickets,
    appUrl: "https://eventpass.example",
    from: "EventPass <tickets@example.test>",
    qrCode: fakeQr,
  });

  assert.equal(email.to[0], paidOrder.buyer_email);
  assert.match(email.subject, /TEST \/ NOT FOR LIVE ADMISSION/);
  assert.match(email.html, /Ada &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(email.html, /<script>alert/);
  assert.match(email.html, /A &lt;Great&gt; Event/);
  assert.match(email.text, /Ticket quantity: 2/);
  assert.match(email.text, /TEST PAYMENT — NOT FOR LIVE ADMISSION/);
  assert.match(email.text, /https:\/\/eventpass\.example\/tickets#access=/);
  assert.equal(email.attachments.length, 2);
  assert.equal(Buffer.from(email.attachments[0].content, "base64").toString(), "png:qr-token-one");
  assert.equal(Buffer.from(email.attachments[1].content, "base64").toString(), "png:qr-token-two");
  assert.match(email.html, /Africa\/Nairobi/);
});

test("email composer refuses pending, review and voided orders", async () => {
  for (const status of ["pending", "review", "voided"]) {
    await assert.rejects(
      buildTicketConfirmationEmail({
        order: { ...paidOrder, status },
        event,
        tickets,
        appUrl: "https://eventpass.example",
        from: "EventPass <tickets@example.test>",
        qrCode: fakeQr,
      }),
      /Only paid orders/
    );
  }
});

test("duplicate paid callbacks after acceptance do not send duplicate confirmations", async () => {
  const store = makeStore();
  const provider = mockFetch();
  const service = createTicketEmailService({
    store,
    apiKey: "test-key",
    from: "EventPass <tickets@example.test>",
    appUrl: "https://eventpass.example",
    fetchImpl: provider.fetchImpl,
    qrCode: fakeQr,
  });

  assert.equal((await service.sendForOrder(paidOrder.id)).accepted, true);
  assert.deepEqual(await service.sendForOrder(paidOrder.id), { accepted: false, reason: "not_due" });
  assert.equal(provider.calls.length, 1);
});

test("concurrent attempts claim a paid order only once", async () => {
  const store = makeStore();
  const provider = mockFetch({ delayMs: 30 });
  const service = createTicketEmailService({
    store,
    apiKey: "test-key",
    from: "EventPass <tickets@example.test>",
    appUrl: "https://eventpass.example",
    fetchImpl: provider.fetchImpl,
    qrCode: fakeQr,
  });

  const results = await Promise.all([
    service.sendForOrder(paidOrder.id),
    service.sendForOrder(paidOrder.id),
  ]);
  assert.equal(results.filter((result) => result.accepted).length, 1);
  assert.equal(provider.calls.length, 1);
});

test("provider failures are recorded and a bounded retry reuses the idempotency key", async () => {
  const store = makeStore();
  const provider = mockFetch({ failCount: 1 });
  const service = createTicketEmailService({
    store,
    apiKey: "test-key",
    from: "EventPass <tickets@example.test>",
    appUrl: "https://eventpass.example",
    fetchImpl: provider.fetchImpl,
    qrCode: fakeQr,
  });

  const failed = await service.sendForOrder(paidOrder.id);
  assert.equal(failed.accepted, false);
  assert.equal(store.state.finished[0].retryAfterSeconds, 60);

  store.state.status = "pending";
  const retried = await service.sendForOrder(paidOrder.id);
  assert.equal(retried.accepted, true);
  assert.equal(provider.calls[0].headers["Idempotency-Key"], provider.calls[1].headers["Idempotency-Key"]);
});

test("automatic provider retries stop after six attempts", async () => {
  const store = makeStore();
  const provider = mockFetch({ failCount: 6 });
  const service = createTicketEmailService({
    store,
    apiKey: "test-key",
    from: "EventPass <tickets@example.test>",
    appUrl: "https://eventpass.example",
    fetchImpl: provider.fetchImpl,
    qrCode: fakeQr,
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) store.state.status = "pending";
    await service.sendForOrder(paidOrder.id);
  }

  assert.equal(store.state.attempts, 6);
  assert.equal(store.state.finished[5].retryAfterSeconds, null);
  assert.deepEqual(await service.sendForOrder(paidOrder.id), {
    accepted: false,
    reason: "not_due",
  });
  assert.equal(provider.calls.length, 6);
});

test("Resend configuration failure preserves payment and records a retryable failure", async () => {
  const store = makeStore();
  const service = createTicketEmailService({
    store,
    apiKey: "",
    from: "",
    appUrl: "https://eventpass.example",
    fetchImpl: mockFetch().fetchImpl,
    qrCode: fakeQr,
  });

  assert.equal((await service.sendForOrder(paidOrder.id)).accepted, false);
  assert.match(store.state.finished[0].error, /configuration is missing/);
  assert.equal(store.state.finished[0].retryAfterSeconds, 60);
});

test("private resend rejects unknown access tokens and non-paid orders", async () => {
  const emailService = { requestManual: async () => ({ accepted: true }) };
  await assert.rejects(
    requestConfirmationForAccess({
      accessToken: "wrong",
      findOrderByAccess: async () => paidOrder,
      emailService,
    }),
    (error) => error.status === 404
  );
  await assert.rejects(
    requestConfirmationForAccess({
      accessToken,
      findOrderByAccess: async () => ({ ...paidOrder, status: "pending" }),
      emailService,
    }),
    (error) => error.status === 409
  );
  await assert.rejects(
    requestConfirmationForAccess({
      accessToken: "b".repeat(64),
      findOrderByAccess: async () => {
        const error = new Error("not found");
        error.status = 404;
        throw error;
      },
      emailService,
    }),
    (error) => error.status === 404
  );
});

test("private resend reports cooldown from the server store", async () => {
  const store = makeStore();
  const service = createTicketEmailService({
    store,
    apiKey: "test-key",
    from: "EventPass <tickets@example.test>",
    appUrl: "https://eventpass.example",
    fetchImpl: mockFetch().fetchImpl,
    qrCode: fakeQr,
  });
  const args = {
    accessToken,
    findOrderByAccess: async () => paidOrder,
    emailService: service,
  };

  assert.equal((await requestConfirmationForAccess(args)).accepted, true);
  await assert.rejects(
    requestConfirmationForAccess(args),
    (error) => error.status === 429
  );
});
