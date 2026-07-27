#!/usr/bin/env bash
# Live Stripe Path B cutover — logs to /tmp/ironframe-stripe-cutover.log
set -euo pipefail
cd /Users/wilwoods/ironframe-grc/ironframe-live
LOG=/tmp/ironframe-stripe-cutover.log
exec > >(tee "$LOG") 2>&1

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) Stripe Path B live cutover ==="
echo "cwd=$(pwd)"

# Avoid empty local STRIPE_SECRET_KEY blanking Vercel-injected secrets
MOVED=0
if [[ -f .env.local ]]; then
  mv .env.local .env.local.bak-stripe-cutover
  MOVED=1
  echo "Moved .env.local aside for vercel env run"
fi

restore() {
  if [[ "$MOVED" -eq 1 && -f .env.local.bak-stripe-cutover ]]; then
    mv .env.local.bak-stripe-cutover .env.local
    echo "Restored .env.local"
  fi
}
trap restore EXIT

echo "--- DRY-RUN ---"
npx vercel env run -e production -- npx tsx scripts/ops/cutover-stripe-pathb-live.ts
DRY=$?
echo "DRY_EXIT=$DRY"

if [[ "$DRY" -ne 0 ]]; then
  echo "Dry-run failed — not executing."
  exit "$DRY"
fi

echo "--- EXECUTE ---"
npx vercel env run -e production -- npx tsx scripts/ops/cutover-stripe-pathb-live.ts --execute
EXEC=$?
echo "EXEC_EXIT=$EXEC"

if [[ -f scripts/dev/stripe-catalog-artifact.live.json ]]; then
  echo "--- ARTIFACT ---"
  # redact nothing critical beyond printing structure; URLs are public payment links
  cat scripts/dev/stripe-catalog-artifact.live.json
fi

exit "$EXEC"
