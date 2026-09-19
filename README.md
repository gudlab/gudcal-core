<h1 align="center">GudCal</h1>

<p align="center">
  Source-available scheduling infrastructure for the AI agent era.<br/>
  Self-hostable Calendly alternative with MCP, team scheduling, and smart availability.
</p>

<p align="center">
  <a href="https://gudcal.com"><strong>Cloud</strong></a> ·
  <a href="https://gudcal.com/demo/meeting"><strong>Live demo</strong></a> ·
  <a href="https://github.com/gudlab/gudcal-core"><strong>GitHub</strong></a> ·
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

If this is useful, **[star this repo](https://github.com/gudlab/gudcal-core)** — it is the source-available edition. Issues and OSS PRs belong here, not on the private SaaS copy.

## Why GudCal

- **Agent-first** — 21 MCP tools plus a REST API so an AI agent can run scheduling after you create one API key
- **Calendly-simple** — event types, availability, buffers, timezone-aware public booking pages
- **Calendar sync** — Google Calendar conflict detection and event creation
- **Teams** — organizations with round-robin and collective scheduling (Team plan on cloud)
- **Self-host or cloud** — Docker / Vercel, or use [gudcal.com](https://gudcal.com)

## Cloud plans

| | Free | Pro ($12/mo) | Team ($20/mo) |
|---|---|---|---|
| Event types | 3 | 20 | Unlimited |
| Calendar connections | 1 | 5 | Unlimited |
| Bookings | Unlimited | Unlimited | Unlimited |
| Analytics / custom domains | — | Yes | Yes |
| Organizations + hosted MCP | — | — | Yes |

Self-hosting (`NEXT_PUBLIC_IS_SELF_HOSTED=true`) removes hosted plan caps on **core scheduling** for **your** org. BSL 1.1 does not allow offering GudCal as a competing hosted Calendly. Hosted MCP on gudcal.com stays Team.

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

See [Self-Hosting](https://gudcal.com/docs/self-hosting) for Docker and production.

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

## MCP

Point any MCP-compatible client at `https://gudcal.com/api/mcp` (Cloud **Team**) or at `/api/mcp` on your self-host.

- Docs: [gudcal.com/docs/mcp](https://gudcal.com/docs/mcp)
- Registry manifest: [`server.json`](./server.json) (this public repo, not the private SaaS copy)
- Cursor / Open Plugins: [`.mcp.json`](./.mcp.json)

```json
{
  "mcpServers": {
    "gudcal": {
      "url": "https://gudcal.com/api/mcp"
    }
  }
}
```

## License

[Business Source License 1.1](LICENSE.md). You can self-host for your own org. You cannot offer GudCal as a competing hosted scheduling service. Change date: **18 Feb 2030** → Apache 2.0.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and small docs PRs are the fastest path in. Private → public sync is a documented script: `./scripts/sync-oss.sh`.
