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

# ─── Optional: Encryption Key ────────────────────────────────
if [ -z "$ENCRYPTION_KEY" ]; then
  export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  warn "ENCRYPT_KEY   → auto-generated (random)"
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
echo "Applying database schema..."
prisma db push --url "$DATABASE_URL" --schema ./prisma/schema.prisma 2>&1 || {
  echo "WARNING: Database setup failed. The app may not work correctly."
  echo "         Make sure PostgreSQL is running and DATABASE_URL is correct."
}
echo ""

# ─── Start the application ───────────────────────────────────
exec "$@"
