<h1 align="center">GudCal</h1>

<p align="center">
  Open-source scheduling infrastructure for the AI agent era.<br/>
  Self-hostable Calendly alternative with MCP server, team scheduling, and smart availability.
</p>

<p align="center">
  <a href="https://github.com/gudlab/gudcal-core"><strong>GitHub</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#quick-start"><strong>Quick Start</strong></a> ·
  <a href="#docker"><strong>Docker</strong></a> ·
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

---

## Features

- **Agent-First** — 18 MCP tools + full REST API for complete autonomous scheduling
- **Smart Scheduling** — Event types, availability rules, buffer times, timezone-aware booking pages
- **Calendar Sync** — Google Calendar integration with conflict detection and event creation
- **MCP Server** — Built-in Model Context Protocol server for AI agent scheduling
- **Teams** — Organizations with round-robin and collective scheduling
- **API & Webhooks** — REST API with key authentication and real-time booking webhooks
- **Video Conferencing** — Auto-generate Zoom and Google Meet links on confirmation
- **Self-Hostable** — Deploy on your own infrastructure with full data ownership
- **No Paywalls** — All features unlocked. Unlimited event types, bookings, and calendars

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/)
- **Auth:** [Auth.js](https://authjs.dev/) v5 with Google OAuth & Credentials
- **Email:** [Resend](https://resend.com/) & [React Email](https://react.email/)
- **UI:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/), [Lucide](https://lucide.dev/)
- **MCP:** [@modelcontextprotocol/sdk](https://modelcontextprotocol.io/)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (or use [Neon](https://neon.tech/) for a free hosted database)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/gudlab/gudcal-core.git
cd gudcal-core
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy the environment file and configure it:

```bash
cp .env.example .env.local
```

4. Set up the database:

```bash
pnpm prisma generate
pnpm prisma db push
```

5. Start the development server:

```bash
pnpm dev
```

Visit `http://localhost:3000` to see GudCal running.

## Docker

The fastest way to self-host GudCal.

### Using Docker Compose (recommended)

1. Clone the repo and create your `.env` file:

```bash
git clone https://github.com/gudlab/gudcal-core.git
cd gudcal-core
cp .env.example .env
```

2. Set the required secrets in `.env`:

```bash
AUTH_SECRET=$(openssl rand -base64 32)
```

3. Start everything:

```bash
docker compose up -d
```

This starts PostgreSQL and GudCal on `http://localhost:3000`.

### Using Docker directly

```bash
docker build -t gudcal .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e AUTH_SECRET="..." \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  gudcal
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for sessions |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployment URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for token encryption |
| `RESEND_API_KEY` | No | For email notifications |
| `GOOGLE_CALENDAR_CLIENT_ID` | No | For Google Calendar integration |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | No | For Google Calendar integration |

## MCP Server

GudCal includes a built-in MCP server that lets AI agents manage scheduling:

- List event types and availability
- Create, confirm, and cancel bookings
- Manage organizations and team members

Connect any MCP-compatible AI client (Claude, GPT, etc.) to GudCal for autonomous scheduling.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

Please open an issue to discuss proposed changes before submitting large pull requests.

## License

Business Source License 1.1. See [LICENSE.md](LICENSE.md) for details.

You can self-host, modify, and use GudCal freely. The only restriction is offering it as a competing hosted scheduling service. On February 18, 2030, the license automatically converts to Apache 2.0.
