#!/usr/bin/env bash
# Mirror cavewebs/gudcal (this tree) onto gudlab/gudcal-core without copying secrets.
#
# Usage:
#   ./scripts/sync-oss.sh           # write a local clone and show git status
#   ./scripts/sync-oss.sh --push    # create sync/YYYYMMDD on origin and push
#
# Histories are not shared. Never: git push public main:main from this repo.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUSH=0
if [[ "${1:-}" == "--push" ]]; then
  PUSH=1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty. Commit or stash first." >&2
  exit 1
fi

BRANCH="sync/$(date -u +%Y%m%d)"
PUBLIC_REMOTE="${PUBLIC_REMOTE:-https://github.com/gudlab/gudcal-core.git}"
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "Cloning ${PUBLIC_REMOTE} …"
git clone --depth 1 "$PUBLIC_REMOTE" "$WORKDIR/gudcal-core"

echo "Copying tree (secrets excluded) …"
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.next/' \
  --exclude 'node_modules/' \
  --exclude 'app/generated/' \
  --exclude '.contentlayer/' \
  --exclude '.vercel/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.pem' \
  --exclude '.DS_Store' \
  --exclude 'BOOKING_FLOW_INVESTIGATION.md' \
  --exclude 'COMPETITIVE_REVIEW.md' \
  "$ROOT/" "$WORKDIR/gudcal-core/"

rm -f "$WORKDIR/gudcal-core/.env" \
  "$WORKDIR/gudcal-core/.env.local" \
  "$WORKDIR/gudcal-core/.env.loc" \
  "$WORKDIR/gudcal-core/.env.production"

cd "$WORKDIR/gudcal-core"

if [[ -e .env.loc || -e .env || -e .env.local ]]; then
  echo "error: secret env file survived the copy; refusing to continue." >&2
  exit 1
fi

git checkout -B "$BRANCH"
git add -A

if git diff --cached --quiet; then
  echo "Public tree already matches. Nothing to commit."
  exit 0
fi

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
git commit -m "sync: from cavewebs/gudcal ${SHA}

Tree copy of the private SaaS repo. Secrets (.env*) are excluded.
See CONTRIBUTING.md for the documented sync command."

echo
git status
echo
echo "Public branch: ${BRANCH}"

if [[ "$PUSH" -eq 1 ]]; then
  git push -u origin "$BRANCH"
  echo "Pushed. Open a PR: https://github.com/gudlab/gudcal-core/pull/new/${BRANCH}"
else
  echo "Dry run. Re-run with --push to publish the branch."
  echo "Clone left at: ${WORKDIR}/gudcal-core (deleted on exit)"
fi
