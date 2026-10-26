** BUILD TICKECK
# 🎟️ EventPass — Smart Event Ticketing Platform

**EventPass** is a modern event ticketing platform designed to help event organizers manage events and help attendees discover events, purchase tickets, and access their tickets digitally.

The platform aims to simplify event registration, ticket sales, payment processing, and ticket verification through QR codes.

## ✨ Features

### 🎉 Event Management
- Browse available events.
- View event details, dates, venues, descriptions, and ticket prices.
- Support multiple ticket pricing options.
- Provide a smooth event discovery and booking experience.

### 🔐 Authentication
- User registration and login.
- Secure authentication powered by Supabase.
- Protected routes for authorized users.
- Separate access to organizer features where configured.

### 💳 Online Payments
- Paystack payment gateway integration.
- Support for secure payment processing.
- Payment verification before issuing paid tickets.
- Test-mode support during development.

### 🎫 Digital Tickets
- Generate unique ticket references.
- QR-code tickets for event entry.
- Display ticket and event information.
- Allow buyers to retrieve their tickets through a private link when implemented.

### 📧 Email Confirmations
- Send ticket confirmation emails after successful payment.
- Include event details and ticket information.
- Provide QR codes or ticket retrieval links when configured.

### 📊 Organizer Dashboard
- Manage event information.
- View ticket sales and booking details.
- Monitor event performance.
- Provide insights that help organizers make better decisions.

### 🤖 AI-Powered Event Insights
The planned AI-assisted feature will help organizers evaluate event performance and receive suggestions for improving attendance, pricing, marketing, and future events.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Building the user interface |
| Vite | Development server and build tool |
| JavaScript | Application functionality |
| React Router | Client-side navigation |
| Lucide React | Interface icons |
| Supabase | Authentication and database services |
| Paystack | Payment processing |
| QR code library | Digital ticket generation |
| Email service | Ticket confirmation emails |
| Vercel | Deployment and hosting |

*The stack above reflects the intended architecture. Confirm that each integration is configured in your current version.*

## 🚀 Getting Started

Follow these steps to run EventPass locally.

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- A Supabase account
- A Paystack account for payment integration

### 1. Clone the repository

```bash
git clone https://github.com/jessejohnstone/eventpass.git
```

### 2. Navigate to the project

```bash
cd eventpass
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the project root and add the public frontend configuration expected by your application.

For a Vite application, the variable names might look like this:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the exact variable names expected by your source code. If your current project uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, update the code or configuration consistently before running the application.

**Security note:** Never expose your Paystack secret key, Supabase secret key, or other privileged credentials in frontend code or variables prefixed with `VITE_`. Payment verification and other privileged operations must be handled by a secure backend or trusted server-side function.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

## ⚙️ Application Configuration

### Supabase
1. Create a Supabase project.
2. Configure authentication providers and redirect URLs.
3. Set up the required database tables and security policies.
4. Add the appropriate project URL and publishable key to your environment variables.

Documentation: https://supabase.com/docs

### Paystack
1. Create or access your Paystack account.
2. Obtain your test public key and secret key.
3. Configure the public key in the frontend only if needed.
4. Store the secret key securely on the server.
5. Verify transactions server-side before issuing paid tickets.
6. Configure payment callbacks and webhooks as required.

Documentation: https://paystack.com/docs/

### Deployment
EventPass can be deployed to Vercel.

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables.
4. Set the framework and build settings for Vite.
5. Deploy and test the production application.

For a standard Vite application, the build command is usually:

```bash
npm run build
```

The output directory is usually:

```text
dist
```

Documentation: https://vercel.com/docs

## 📁 Project Structure

The exact structure may differ depending on your implementation.

```text
eventpass/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── EventDetails.jsx
│   │   ├── Login.jsx
│   │   └── OrganizerDashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.local
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

## 🔒 Security Best Practices

- Never commit `.env` or `.env.local` files.
- Never publish secret API keys or payment credentials.
- Verify every paid transaction on the server.
- Use Supabase Row Level Security (RLS) to protect user and booking data.
- Generate unique ticket identifiers and validate tickets during check-in.
- Protect private ticket retrieval links against unauthorized access.
- Validate payment webhook signatures and prevent duplicate ticket issuance.
- Keep dependencies updated and test important payment flows before production.

## 🗺️ Future Improvements

- [ ] Complete automated ticket confirmation emails.
- [ ] Finish QR-code scanning and event check-in.
- [ ] Add a dedicated attendee ticket dashboard.
- [ ] Add ticket refunds and cancellation workflows.
- [ ] Build detailed sales analytics for organizers.
- [ ] Introduce AI-powered event success recommendations.
- [ ] Add event reviews and attendee feedback.
- [ ] Improve mobile responsiveness and accessibility.
- [ ] Add automated tests for payment and ticket workflows.

## 🤝 Contributing

Contributions, ideas, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your implementation.
5. Submit a pull request describing your improvements.

## 👨‍💻 Author

**Jesse Johnstone**

Frontend Developer & Software Engineer

- GitHub: [@jessejohnstone](https://github.com/jessejohnstone)
- Project Repository: [EventPass](https://github.com/jessejohnstone/eventpass)

## 📄 License

A license has not yet been specified. Add a `LICENSE` file and update this section once the project's licensing terms have been decided.

---

**EventPass — Discover events. Book tickets. Make memories.** 🎟️
