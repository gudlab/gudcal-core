# Upgrading GudCal (schema / Prisma Migrate)

GudCal applies the database schema with **Prisma Migrate**. Docker and other production / self-host starts run `prisma migrate deploy` against `DATABASE_URL` (see `prisma.config.ts`). That command no longer uses `prisma db push`.

This file covers a **fresh install** and an **existing database** that was previously updated with `db push`. Keep the `ENCRYPTION_KEY` notes in the README; they are unchanged.

Do not run `prisma migrate reset`. Do not pass `--accept-data-loss`.

The current baseline migration is `20261026120000_baseline`. It creates the full schema in `prisma/schema.prisma` (auth tables plus scheduling: `event_types`, `bookings`, `calendar_connections`, enums, and the rest).

## Fresh install (empty database)

1. Set `DATABASE_URL` (and the rest of `.env` / `.env.local`).
2. Generate the client and apply history:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

Docker Compose and the published image do this at container start. An empty volume should come up without extra steps.

## Existing database previously managed with `db push`

`db push` updates tables and does **not** write Prisma’s migration history. After this change, `migrate deploy` will try to run `20261026120000_baseline`. On a non-empty database with no history, Prisma 7 exits with **P3005** (`The database schema is not empty`). That is expected. Do not reset the database.

### 1. Confirm the live schema matches `schema.prisma`

From a checkout of this version, with `DATABASE_URL` pointing at the instance:

```bash
pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
```

- Empty diff: the database already matches. Continue to step 2.
- Non-empty diff: the database **drifted**. Do not mark the baseline applied. See [Schema drift](#schema-drift).

### 2. Record the baseline as already applied

```bash
pnpm prisma migrate resolve --applied 20261026120000_baseline
```

This only inserts a row in `_prisma_migrations`. It does not change tables or data.

With Docker, use the same image and `DATABASE_URL` as the app, and **bypass the image `ENTRYPOINT`**. The entrypoint runs `prisma migrate deploy` before your command. Without `--entrypoint`, that deploy hits **P3005** and `resolve` never runs:

```bash
docker compose run --rm --entrypoint prisma app migrate resolve --applied 20261026120000_baseline
```

### 3. Start the app (or run deploy)

```bash
pnpm prisma migrate deploy
```

Or restart the container. Future schema changes ship as new folders under `prisma/migrations/` and apply on the next `migrate deploy`.

## Schema drift

If `migrate diff --from-config-datasource --to-schema prisma/schema.prisma` prints SQL, the live database does not match this repo.

1. Read the diff. Prefer **additive** fixes (create a missing table, enum, column, or index).
2. Apply only the statements you accept, using your usual Postgres client. Do not drop production data to “make it match.”
3. Re-run the diff until it is empty.
4. Then `prisma migrate resolve --applied 20261026120000_baseline` and `prisma migrate deploy`.

If you cannot tell whether a statement is safe, stop and inspect a backup or a copy of the database first.

## Stale `20240705091917_init` row in `_prisma_migrations`

Older checkouts shipped an auth-only init migration. That folder is gone. If `_prisma_migrations` still lists `20240705091917_init`, `migrate deploy` may refuse to run because history on disk and in the database disagree.

1. Run the schema diff above.
2. If the live schema **already matches** `schema.prisma`:
   - `pnpm prisma migrate resolve --applied 20261026120000_baseline`
   - Remove only the stale history row (this does not drop tables):

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20240705091917_init';
```

3. If the database still has **only** the original auth tables (`users`, `accounts`, `sessions`, `verification_tokens`) and none of the scheduling tables, **do not** run the baseline SQL. `CREATE TABLE "users"` (and the other existing names) will fail. Create the missing enums, tables, indexes, and foreign keys until the diff is empty, then record the baseline as applied. Do not use `migrate reset`.

## Local development

`pnpm prisma db push` remains a **local-dev** shortcut when you are iterating on `schema.prisma` and do not want a migration file yet. Do not use it for Docker or production self-host.

When a schema change is ready to ship, add a migration under `prisma/migrations/` and apply it with `migrate deploy` in every other environment.

## Prisma 7 notes

- Datasource URL comes from `prisma.config.ts` (`env("DATABASE_URL")`), not from `schema.prisma`.
- `prisma migrate deploy`, `migrate resolve`, and `migrate diff --from-config-datasource` all read that config.
- `prisma generate` still uses `prisma/schema.prisma` (client output: `app/generated/prisma`).
