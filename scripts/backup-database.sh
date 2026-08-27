#!/bin/bash
set -euo pipefail

# Manual, on-demand database backup. Run this any time you want an
# immediate snapshot — e.g. right before running a migration, or just
# to have a fresh copy today.
#
# Usage: ./scripts/backup-database.sh
#
# Requires: pg_dump installed locally.
#   macOS:  brew install libpq && brew link --force libpq
#   (or install the full Postgres.app, which includes it)

cd "$(dirname "$0")/.."

if ! command -v pg_dump &> /dev/null; then
  echo "pg_dump is not installed. On macOS, run: brew install libpq && brew link --force libpq"
  exit 1
fi

# DIRECT_URL, not DATABASE_URL — pg_dump needs a real, direct
# connection. DATABASE_URL goes through Supabase's pooled pgbouncer
# connection (transaction pooling mode), which doesn't support some
# of the session-level operations pg_dump relies on.
DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d '=' -f2- | tr -d '"')

if [ -z "$DIRECT_URL" ]; then
  echo "DIRECT_URL not found in .env"
  exit 1
fi

mkdir -p backups
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="backups/backup_${TIMESTAMP}.sql"

echo "Backing up database to ${OUTPUT_FILE}..."
pg_dump --clean --if-exists "$DIRECT_URL" > "$OUTPUT_FILE"

echo "Done. Backup saved to ${OUTPUT_FILE} ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo ""
echo "IMPORTANT: this file contains all your real user data — never commit it to git."
echo "Make sure 'backups/' is in your .gitignore."