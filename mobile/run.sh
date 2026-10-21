#!/usr/bin/env bash
set -euo pipefail

app="${1:-customer}"
case "$app" in
  customer|seller|rider) ;;
  *) echo "Usage: ./run.sh [customer|seller|rider]" >&2; exit 2 ;;
esac

: "${SUPABASE_KEY:?Set SUPABASE_KEY to the Supabase sb_publishable_... key}"
: "${GOOGLE_SERVER_CLIENT_ID:?Set GOOGLE_SERVER_CLIENT_ID to the Google Web OAuth client ID}"

args=(
  "--dart-define=SUPABASE_KEY=$SUPABASE_KEY"
  "--dart-define=GOOGLE_SERVER_CLIENT_ID=$GOOGLE_SERVER_CLIENT_ID"
)
ios_var="GOOGLE_IOS_CLIENT_ID_$(printf '%s' "$app" | tr '[:lower:]' '[:upper:]')"
ios_client_id="${!ios_var:-${GOOGLE_IOS_CLIENT_ID:-}}"
if [[ -n "$ios_client_id" ]]; then
  args+=("--dart-define=GOOGLE_IOS_CLIENT_ID=$ios_client_id")
fi

cd "$(dirname "$0")/apps/kariakoo_$app"
flutter run "${args[@]}"
