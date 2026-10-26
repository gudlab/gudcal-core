#!/bin/sh
set -e

# ─── GudCal Docker Entrypoint ────────────────────────────────
# Auto-fills missing environment variables with sensible defaults
# so that `docker compose up` works out of the box.

WARNED=false

warn() {
  if [ "$WARNED" = "false" ]; then
    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│  WARNING: Using auto-generated / demo environment values   │"
    echo "├─────────────────────────────────────────────────────────────┤"
    WARNED=true
  fi
  echo "│  $1"
}

# ─── Database ────────────────────────────────────────────────
# Auto-filled from the Docker Compose PostgreSQL service
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgres://gudcal:gudcal_password@db:5432/gudcal"
  warn "DATABASE_URL  → set to Docker Compose PostgreSQL"
fi

# ─── Auth Secret ─────────────────────────────────────────────
# Auto-generated random secret (safe for single-instance deploys)
if [ -z "$AUTH_SECRET" ]; then
  export AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  warn "AUTH_SECRET   → auto-generated (random)"
fi

# ─── App URL ─────────────────────────────────────────────────
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  export NEXT_PUBLIC_APP_URL="http://localhost:3000"
  warn "APP_URL       → defaulted to http://localhost:3000"
fi

# ─── Google OAuth ────────────────────────────────────────────
# Demo values — Google login will NOT work until replaced
if [ -z "$GOOGLE_CLIENT_ID" ]; then
  export GOOGLE_CLIENT_ID="000000000000-demo.apps.googleusercontent.com"
  warn "GOOGLE_ID     → demo value (Google login will NOT work)"
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  export GOOGLE_CLIENT_SECRET="GOCSPX-demo-secret-replace-me"
  warn "GOOGLE_SECRET → demo value (Google login will NOT work)"
fi

# ─── Email (Resend) ──────────────────────────────────────────
# Demo value — emails will NOT send until replaced
if [ -z "$RESEND_API_KEY" ]; then
  export RESEND_API_KEY="re_demo_000000000000000000000000000"
  warn "RESEND_KEY    → demo value (emails will NOT send)"
fi

# ─── Encryption key for calendar tokens ──────────────────────
# Must be persistent. A random key per start makes stored tokens unreadable.
if [ -z "$ENCRYPTION_KEY" ]; then
  warn "ENCRYPT_KEY   → unset (set a persistent ENCRYPTION_KEY before connecting Google Calendar)"
fi

# ─── Optional: Cron Secret ───────────────────────────────────
if [ -z "$CRON_SECRET" ]; then
  export CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  warn "CRON_SECRET   → auto-generated (random)"
fi

# ─── Print warning footer ───────────────────────────────────
if [ "$WARNED" = "true" ]; then
  echo "│                                                             │"
  echo "│  To configure real values, create a .env file or set them   │"
  echo "│  in docker-compose.yml. See .env.example for all options.   │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
fi

# ─── Provide origin for Next.js font URL resolution ──────────
export __NEXT_PRIVATE_ORIGIN="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

# ─── Run database migrations ─────────────────────────────────
# Production / self-host uses migrate deploy (not db push).
# Never pass --accept-data-loss. If this database was created with
# `prisma db push`, follow UPGRADE.md before retrying.
echo "Applying database migrations (prisma migrate deploy)..."
if ! prisma migrate deploy; then
  echo "ERROR: prisma migrate deploy failed."
  echo "       Confirm PostgreSQL is reachable and DATABASE_URL is correct."
  echo "       If this database was previously updated with prisma db push,"
  echo "       read UPGRADE.md (baseline existing databases) before retrying."
  exit 1
fi
echo ""

# ─── Start the application ───────────────────────────────────
exec "$@"
