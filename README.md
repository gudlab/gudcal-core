<h1 align="center">GudCal</h1>

<p align="center">
  Source-available scheduling infrastructure for the AI agent era.<br/>
  Self-hostable Calendly alternative with MCP, team scheduling, and smart availability.
</p>

<p align="center">
  <a href="https://gudcal.com"><strong>Cloud</strong></a> ·
  <a href="https://gudcal.com/demo/meeting"><strong>Live demo</strong></a> ·
  <a href="https://gudcal.com/docs"><strong>Docs</strong></a> ·
  <a href="#docker"><strong>Docker</strong></a>
</p>

<p align="center">
  <a href="https://github.com/gudlab/gudcal-core/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/gudlab/gudcal-core?style=flat" /></a>
  <a href="LICENSE.md"><img alt="License: BSL 1.1" src="https://img.shields.io/badge/license-BSL%201.1-blue" /></a>
  <a href="https://gudcal.com"><img alt="Website" src="https://img.shields.io/badge/cloud-gudcal.com-emerald" /></a>
</p>

<p align="center">
  <img src="https://www.gudcal.com/_static/images/light-preview.jpg" alt="GudCal dashboard" width="800" />
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/gudlab/gudcal-core"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

If GudCal is useful, please **star this repo** — it is the fastest way to help the project get discovered.

## Why GudCal

- **Agent-first** — 21 MCP tools plus a REST API so an AI agent can run scheduling after you create one API key
- **Calendly-simple** — event types, availability, buffers, timezone-aware public booking pages
- **Calendar sync** — Google Calendar conflict detection and event creation
- **Teams** — organizations with round-robin and collective scheduling
- **Self-host or cloud** — Docker / Vercel, or use [gudcal.com](https://gudcal.com)

## Quick start

```bash
git clone https://github.com/gudlab/gudcal-core.git
cd gudcal-core
pnpm install
cp .env.example .env.local
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

Visit `http://localhost:3000`.

## Docker

### Docker Compose (recommended)

```bash
git clone https://github.com/gudlab/gudcal-core.git
cd gudcal-core
cp .env.example .env
# set AUTH_SECRET and other required secrets in .env
docker compose up -d
```

GudCal listens on `http://localhost:3000`.

### Docker directly

```bash
docker build -t gudcal .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e AUTH_SECRET="..." \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  gudcal
```

## Cloud vs self-host

Hosted [gudcal.com](https://gudcal.com) has a Free plan (3 event types, 1 calendar, unlimited bookings), Pro at $12/mo, and Team at $20/mo (organizations + MCP).

Self-hosting is for running **your** scheduling. The BSL 1.1 license does not allow offering GudCal as a competing hosted scheduling product. Change date: **18 Feb 2030** → Apache 2.0.

## MCP

Point any MCP-compatible client at GudCal to list event types, read availability, and create or cancel bookings. Docs: https://gudcal.com/docs/mcp

## Contributing

1. Open an issue first for anything larger than a typo
2. Fork → feature branch → PR
3. Docs and `good first issue` labels are the fastest path in

## License

[Business Source License 1.1](LICENSE.md). You can self-host, modify, and use GudCal. You cannot offer it as a competing hosted scheduling service.
