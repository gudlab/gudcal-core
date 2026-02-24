FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

# ─── Build ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_IS_SELF_HOSTED=true
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000

# Skip env.mjs validation during build — real values are injected at runtime
ENV SKIP_ENV_VALIDATION=1

# Dummy build-time values so modules that init clients at import don't crash
# (these are never used at runtime — the entrypoint injects real/demo values)
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-placeholder-secret-not-used-at-runtime"
ENV GOOGLE_CLIENT_ID="000000000000-build.apps.googleusercontent.com"
ENV GOOGLE_CLIENT_SECRET="GOCSPX-build-placeholder"
ENV RESEND_API_KEY="re_build_placeholder_000000000000000"
ENV HOSTNAME="localhost"

# Increase heap for TypeScript checking during Next.js build
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm build

# ─── Production ────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_IS_SELF_HOSTED=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install prisma CLI for running migrations at startup
RUN npm install -g prisma@7

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/assets/fonts ./assets/fonts

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Entrypoint script (auto-fills missing env vars)
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
