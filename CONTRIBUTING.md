# Contributing to GudCal

Thanks for wanting to help. The public source-available repo is [gudlab/gudcal-core](https://github.com/gudlab/gudcal-core). Star that repo, open issues there, and send OSS PRs there. `cavewebs/gudcal` is the private SaaS copy that ships [gudcal.com](https://gudcal.com).

## Before you start

1. Open an issue for anything larger than a typo.
2. Use existing labels: `good first issue`, `documentation`, `bug`.
3. Keep PRs focused. One problem per PR.
4. Do not weaken Cloud **Team** gating (organizations + hosted MCP). Self-host is uncapped for core scheduling; Cloud plans stay Free / Pro $12 / Team $20.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

Required env: `DATABASE_URL`, `NEXTAUTH_SECRET` / `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY` (64-char hex).

Never commit `.env`, `.env.local`, or `.env.loc`. Those files are gitignored on purpose.

## Checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Publishing private → `gudlab/gudcal-core`

Private `cavewebs/gudcal` and public `gudlab/gudcal-core` do **not** share commit SHAs. After a SaaS change lands on `main`, the public edition is a **tree sync**. Do not rely on memory; use the script.

From a clean `main` on `cavewebs/gudcal`:

```bash
# Preview the public tree (no push)
./scripts/sync-oss.sh

# Create branch sync/YYYYMMDD on gudlab/gudcal-core and push
./scripts/sync-oss.sh --push
```

The script:

1. Clones `gudlab/gudcal-core`
2. Rsyncs this tree onto it
3. Deletes secrets (`.env`, `.env.*`, `*.pem`) even if someone tracked them privately
4. Opens a branch so you can PR into public `main`

Do not `git push` this private remote's `main` directly onto `gudcal-core` — the histories diverged, and a raw push can leak files that must stay private.

After the public PR merges, set GitHub metadata if it drifted:

```bash
gh api -X PATCH repos/gudlab/gudcal-core \
  -f homepage='https://gudcal.com' \
  -f description='Source-available scheduling infrastructure for the AI agent era. Self-hostable Calendly alternative with MCP.'

gh api -X PUT repos/gudlab/gudcal-core/topics \
  -H 'Accept: application/vnd.github+json' \
  -f names[]='scheduling' \
  -f names[]='calendly-alternative' \
  -f names[]='mcp' \
  -f names[]='nextjs' \
  -f names[]='calendar' \
  -f names[]='booking' \
  -f names[]='self-hosted' \
  -f names[]='typescript' \
  -f names[]='prisma' \
  -f names[]='docker'
```

## License

Contributions are accepted under the same BSL 1.1 terms as the rest of the project. See [LICENSE.md](LICENSE.md). You may self-host GudCal for your own organization. You may not offer it as a competing hosted Calendly-style service.
