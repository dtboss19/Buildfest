#!/usr/bin/env bash
# Update Supabase Auth config (rate limits + auto-confirm email) via Management API.
# Fixes "email rate limit exceeded" and avoids requiring email confirmation for sign-up.
#
# 1. Create a Personal Access Token: https://supabase.com/dashboard/account/tokens
# 2. Run: SUPABASE_ACCESS_TOKEN="your-token" ./scripts/update-supabase-auth.sh
#    Or: export SUPABASE_ACCESS_TOKEN="your-token" && npm run supabase:auth-fix

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/frontend/.env"

# Project ref: from env or parse from frontend/.env
if [ -n "$PROJECT_REF" ]; then
  REF="$PROJECT_REF"
else
  if [ -f "$ENV_FILE" ]; then
    URL=$(grep -E "^VITE_SUPABASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
    # https://xxxx.supabase.co -> xxxx
    REF=$(echo "$URL" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')
  fi
fi

if [ -z "$REF" ]; then
  echo "Error: PROJECT_REF not set and could not read from frontend/.env (VITE_SUPABASE_URL)"
  exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is required."
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  echo "Then run: SUPABASE_ACCESS_TOKEN=\"your-token\" $0"
  exit 1
fi

API="https://api.supabase.com/v1/projects/$REF/config/auth"
echo "Project ref: $REF"
echo "GET current auth config..."
CURRENT=$(curl -s -S -X GET "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")
if echo "$CURRENT" | grep -q '"message"'; then
  echo "API error: $CURRENT"
  exit 1
fi

# Note: rate_limit_email_sent can only be changed with custom SMTP on hosted projects.
# Setting mailer_autoconfirm so new users can sign in without confirming email (fewer emails sent).
echo "PATCH auth config: mailer_autoconfirm=true..."
RESP=$(curl -s -S -X PATCH "$API" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mailer_autoconfirm": true}')

if echo "$RESP" | grep -q '"message"'; then
  echo "PATCH error: $RESP"
  exit 1
fi

echo "Auth config updated successfully."
echo "- mailer_autoconfirm: true (new users can sign in without confirming email)"
echo "Try signing up again in the app. If you still hit rate limit, wait ~1 hour or use a different email (e.g. you+test@gmail.com)."
