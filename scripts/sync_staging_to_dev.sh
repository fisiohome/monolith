#!/usr/bin/env bash
set -euo pipefail

# Expected env vars
# Need to export this vars first
# export STAGING_DB_URL="<POSTGRES_URL>"
# export LOCAL_DB_URL="<POSTGRES_URL>"
: "${STAGING_DB_URL:?Need STAGING_DB_URL}"
: "${LOCAL_DB_URL:?Need LOCAL_DB_URL}"

dump_file="tmp/staging.dump"

echo "Dumping staging..."
pg_dump --format=custom --no-owner --no-privileges \
  --dbname="$STAGING_DB_URL" \
  --file="$dump_file"

echo "Resetting local databases..."
bin/rails db:drop db:create

echo "Restoring into development..."
pg_restore --verbose --no-owner \
  --dbname="$LOCAL_DB_URL" \
  "$dump_file"

echo "Running migrations..."
bin/rails db:migrate

echo "Done."