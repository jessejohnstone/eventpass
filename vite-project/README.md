# EventPass

EventPass is a React/Vite event discovery and organizer app with Supabase-backed authentication and events, Paystack checkout, verified ticket issuance, QR tickets, and Resend confirmation email support.

## Requirements

- Node.js 20.19+ or 22.12+ (the current Vite version requires a modern Node runtime)
- A Supabase project with the existing EventPass schema and RPCs
- Paystack account (use test credentials for development)
- Resend account and a verified sender domain for production email

## Environment configuration

Copy `.env.example` to `.env` in this project root. Keep `.env` and `.env.local` out of source control. Do not paste credentials into chat or commit them.

Backend `.env` values:

- `APP_URL`: frontend origin; locally `http://127.0.0.1:5175`.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret/service-role key. Never use a publishable key here.
- `SUPABASE_URL`: optional when the backend can use `VITE_SUPABASE_URL` from `.env`.
- `PAYSTACK_SECRET_KEY`: Paystack test key for development. This selects test/live handling.
- `RESEND_API_KEY`: Resend API key with permission to send from the verified domain.
- `EMAIL_FROM`: verified sender, for example `EventPass <tickets@your-verified-domain.example>`.
- `CRON_SECRET`: long random secret used only by the retry scheduler endpoint.
- `PORT`: backend port; defaults to `3001`.

Frontend public values belong in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only the `VITE_` values are bundled into browser code. Never put Resend, Paystack, or Supabase server secrets in `.env.local` or in any `VITE_` variable.

## Resend sender setup

1. In Resend, add the sending domain you intend to use.
2. Add the DNS records Resend gives you at your DNS provider.
3. Wait for Resend to mark the domain verified.
4. Create a server-side API key and set it as `RESEND_API_KEY` in `.env`.
5. Set `EMAIL_FROM` to a sender address on that verified domain.
6. Restart the backend after changing environment settings.

Resend API acceptance is recorded separately from inbox delivery; accepted does not guarantee the message reached the recipient's inbox. The outbox records accepted provider message IDs and failure/retry state.

## Database migration

Manually apply [`supabase/migrations/20261025090000_ticket_confirmation_email_outbox.sql`](supabase/migrations/20261025090000_ticket_confirmation_email_outbox.sql) in the Supabase SQL Editor or using your established Supabase migration workflow. This creates the private confirmation outbox and its service-role-only claim, completion, and manual-request functions. It also enqueues existing paid orders that already have tickets.

The migration enables row-level security, removes browser-role table access, and grants access to the backend service role. Apply it before relying on confirmation or retry behavior. Existing database migrations were not present in this repository, so confirm that the referenced `orders.id`, `tickets.order_id`, and status/column names match your deployed schema before applying it.

## Run locally

From this project directory:

- `npm install`
- `npm run dev` — Vite frontend at `http://127.0.0.1:5175/`
- In another terminal, `npm run server` — Express API on port 3001

Vite proxies `/api` to the Express backend. The API health check is `http://127.0.0.1:5175/api/health`.

## Durable retry scheduler

The backend exposes `POST /api/internal/ticket-confirmations/retry`, protected by `Authorization: Bearer <CRON_SECRET>`. It claims up to five due outbox records at a time. Database leases prevent concurrent workers from sending the same generation simultaneously. Resend idempotency keys are stable per order and generation. Automatic attempts are bounded to six over a 23-hour window; a buyer can explicitly request another generation after the per-order cooldown.

No scheduler is configured by this repository. Configure one yourself after deployment:

### Windows Task Scheduler

1. Keep `APP_URL` and `CRON_SECRET` in the project-root `.env` readable only by the task account. The provided script loads just those two settings from `.env`; it never prints them. Avoid putting the secret in the task's command-line arguments or logs.
2. Create a task with a 5-minute repeat interval, indefinitely, and an appropriate startup trigger.
3. Set the action program to `powershell.exe` and arguments to `-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\eventpass\vite-project\scripts\retry-confirmations.ps1"`.
4. The script reads `APP_URL` and `CRON_SECRET` from the task process environment and posts to the protected endpoint. Test the task manually and verify HTTP success without logging authorization headers.

For a hosted scheduler, make an authenticated POST to `/api/internal/ticket-confirmations/retry` every five minutes and store `CRON_SECRET` in the scheduler's secret store. Do not describe the scheduler as active until you have deployed and enabled it. The outbox is durable before that, but automatic retries wait for a worker invocation.

## Buyer resend

The private ticket page provides **Send confirmation email**. The browser submits only the existing private order access token; the server loads the recipient from the paid order. The endpoint has IP rate limiting plus a database-enforced two-minute cooldown per order. The UI reports provider acceptance and explicitly does not claim inbox delivery. If email is unavailable, existing ticket access and the paid order remain available.

## Testing and controlled end-to-end check

Run the mocked provider tests and production build:

- `npm test`
- `npm run build`
- `npm run lint`

These tests use fake email-provider and QR responses. They do not send email or initiate payments.

For one controlled integration test after applying the migration and configuring Resend:

1. Use Paystack **test mode**, a test recipient mailbox you control, and a verified sender domain.
2. Publish a test event with a low-value ticket type. Use a unique email address you control.
3. Complete one Paystack test checkout, then check that the ticket page loads and that a single confirmation arrives with one QR attachment per ticket. Confirm the test label and private `#access` link are present.
4. Request a resend once, confirm the API reports provider acceptance, then request immediately again and confirm the cooldown response. Do not use a real payment or a live payment key for this test.
5. Confirm the outbox status is `accepted` and retain no private link, QR token, or access token in logs or screenshots.

## Current boundaries

- Ticket confirmation does not create tickets; it reuses the ticket rows produced by the existing verified payment transaction.
- The outbox records Resend acceptance, not final inbox delivery or bounces.
- Email retry scheduling is not active until a scheduler is configured.
- This repository does not include the existing base schema/RPC migrations; check the new migration against the deployed Supabase schema before running it.
