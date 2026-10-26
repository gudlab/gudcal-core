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
  <a href="https://www.gudcal.com">
    <img src="docs/assets/gudcal-hero.svg" alt="GudCal homepage" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://www.gudcal.com">
    <img src="docs/assets/gudcal-tour.svg" alt="GudCal product tour" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://www.gudcal.com">Watch the full reel on gudcal.com</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/gudlab/gudcal-core"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

If this is useful, **[star this repo](https://github.com/gudlab/gudcal-core)** — it is the source-available edition. Issues and OSS PRs belong here, not on the private SaaS copy.

## Why GudCal

- **Agent-first** — 21 MCP tools plus a REST API so an AI agent can run scheduling after you create one API key
- **Calendly-simple** — event types, availability, buffers, timezone-aware public booking pages
- **Calendar sync** - Google Calendar free/busy on availability, booking create, and reschedule, plus event creation
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
cp .env.example .env.local
# Set DATABASE_URL before install. `pnpm install` runs `prisma generate`;
# prisma.config.ts requires that variable (dotenv loads `.env`; export works too).
pnpm install
pnpm prisma generate
pnpm prisma db push   # local-dev only
pnpm dev
```

`pnpm prisma db push` is a local-dev shortcut while iterating on `schema.prisma`. Docker and production self-host run `pnpm prisma migrate deploy` (the image entrypoint does this at start). Existing databases that were created with `db push` need a one-time baseline first. See [UPGRADE.md](UPGRADE.md).

Calendar token encryption uses `ENCRYPTION_KEY` (64 hex characters: `openssl rand -hex 32`). Set it before connecting Google Calendar and keep the same value across restarts. If it is unset, token encrypt/decrypt fails with a clear error instead of minting a random key.

Upgrade note: older GudCal builds (and the Docker entrypoint) minted a random `ENCRYPTION_KEY` when it was unset. After this change that fallback is gone. If you already connected Google Calendar under a generated or missing key, set a persistent `ENCRYPTION_KEY` in `.env` / `.env.local` and reconnect Google Calendar. Stored tokens from the old key cannot be decrypted.

When Google Calendar is connected, public availability and MCP `get_availability` exclude those busy times. A failed busy lookup is logged and treated as no extra busy on reads. Booking create, reschedule, and MCP `create_booking` reject overlapping busy time with HTTP 409, or HTTP 503 if the lookup fails. With no calendar connected, only GudCal bookings count as busy.

See [Self-Hosting](https://gudcal.com/docs/self-hosting) for Docker and production.

## Docker

### Docker Compose (recommended)

```bash
git clone https://github.com/gudlab/gudcal-core.git
cd gudcal-core
cp .env.example .env
# set AUTH_SECRET, ENCRYPTION_KEY, and other required secrets in .env
docker compose up -d
```

GudCal listens on `http://localhost:3000`. The app entrypoint runs `prisma migrate deploy` against `DATABASE_URL`. If this database was previously updated with `prisma db push`, follow [UPGRADE.md](UPGRADE.md) before the container can apply migration history. When you record the baseline from Compose, bypass the entrypoint (`--entrypoint prisma`) so `migrate deploy` does not run first.

### Docker directly

```bash
docker build -t gudcal .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e AUTH_SECRET="..." \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  gudcal
```

Reuse the same `ENCRYPTION_KEY` on later `docker run` invocations. Generating a new value on each start makes stored calendar tokens unreadable.

On HTTPS, set `APP_URL=https://your.domain` at runtime (for example `-e APP_URL="https://cal.example.com"`). The Google Calendar OAuth nonce cookie is `Secure` only when that runtime URL uses `https:`. `NEXT_PUBLIC_APP_URL` is inlined when the image is built, so an image built with `http://localhost:3000` cannot pick up a later HTTPS `NEXT_PUBLIC_*` value.

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
