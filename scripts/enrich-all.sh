#!/bin/bash
# Enrich all products by calling the sync-products edge function in batches.
# Usage: ./scripts/enrich-all.sh

set -euo pipefail

SUPABASE_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"
BATCH_SIZE="${BATCH_SIZE:-20}"

# Sign in as admin
echo "[enrich] Signing in as admin..."
ACCESS_TOKEN=$(curl -sf -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"austin@merchmakers.com","password":"testpassword123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "[enrich] Failed to get auth token"
  exit 1
fi

echo "[enrich] Starting enrichment (batch size: ${BATCH_SIZE})..."

TOTAL_ENRICHED=0
TOTAL_ERRORS=0

while true; do
  RESULT=$(curl -sf -X POST "${SUPABASE_URL}/functions/v1/sync-products" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"phase\":\"enrich\",\"batchSize\":${BATCH_SIZE}}")

  ENRICHED=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['enriched'])")
  REMAINING=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['remaining'])")
  ERRORS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['errors'])")
  TOTAL=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])")

  TOTAL_ENRICHED=$((TOTAL_ENRICHED + ENRICHED))
  TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

  DONE=$((TOTAL - REMAINING))
  echo "[enrich] Batch done: +${ENRICHED} enriched, ${ERRORS} errors | Progress: ${DONE}/${TOTAL} (${REMAINING} remaining)"

  if [ "$REMAINING" -eq 0 ]; then
    break
  fi

  # Brief pause between batches
  sleep 1
done

echo ""
echo "[enrich] Complete! Total enriched: ${TOTAL_ENRICHED}, Total errors: ${TOTAL_ERRORS}"
