# Sync staging data into local development

This document explains how to use `scripts/sync_staging_to_dev.sh` to clone the staging PostgreSQL database into your local development environment.

## When to use this script
Use the script when you need a realistic dataset locally for debugging, performance checks, or reproducing staging-only issues. It will **drop and recreate** your local development, cache, queue, cable, and test databases—do not run it if you have local data worth keeping.

## Prerequisites
1. PostgreSQL client tools (`pg_dump`, `pg_restore`) available on your `$PATH`.
2. Network access to the staging database URL.
3. A running local PostgreSQL server that matches the URL you supply for `LOCAL_DB_URL`.
4. Rails app dependencies installed so `bin/rails` commands succeed.

## Required environment variables
The script enforces two variables before doing anything:

```bash
export STAGING_DB_URL="postgres://<user>:<password>@<host>:<port>/<staging_db_name>"
export LOCAL_DB_URL="postgres://<user>:<password>@<host>:<port>/<local_db_name>"
```

* `STAGING_DB_URL` must point to the remote database you want to dump.
* `LOCAL_DB_URL` must point to the local database you will overwrite (typically `postgres://postgres:postgres@localhost:5432/monolith_development`).

You can confirm they are set with `echo $STAGING_DB_URL` (note the `$`).

## One-time setup after pulling new data from staging
Rails tracks the environment that last touched the database. After restoring staging data locally, set the environment flag once to avoid protected-environment errors:

```bash
bin/rails db:environment:set RAILS_ENV=development
```

## Script workflow
`scripts/sync_staging_to_dev.sh` performs the following steps:

1. **Dump staging** – runs `pg_dump --format=custom --no-owner --no-privileges` and stores the snapshot at `tmp/staging.dump`.
2. **Reset local databases** – executes `bin/rails db:drop db:create`, affecting primary, cache, queue, cable, and test DBs defined in `config/database.yml`.
3. **Restore locally** – uses `pg_restore --verbose --no-owner` to import the dump into the database specified by `LOCAL_DB_URL`.
4. **Run migrations** – executes `bin/rails db:migrate` to ensure the schema matches your current codebase.
5. **Done** – leaves `tmp/staging.dump` in case you want to re-run the restore without re-dumping.

## Usage example
```bash
export STAGING_DB_URL="postgres://…/monolith_staging"
export LOCAL_DB_URL="postgres://postgres:postgres@localhost:5432/monolith_development"

bin/rails db:environment:set RAILS_ENV=development   # run once after pulling staging data
scripts/sync_staging_to_dev.sh
```

## Troubleshooting
| Symptom | Cause | Fix |
| --- | --- | --- |
| `Need STAGING_DB_URL` / `Need LOCAL_DB_URL` | Env vars not exported or exported without `=` | Re-export with `export VAR=value`. |
| `ActiveRecord::EnvironmentMismatchError` during `db:drop` | Database metadata still marked as `staging` | Run `bin/rails db:environment:set RAILS_ENV=development` and re-run the script. |
| `connection to server at "localhost" … refused` | Local PostgreSQL not running or URL points to the wrong host | Start Postgres (e.g., via Docker/service) or update `LOCAL_DB_URL` (e.g., `postgresql://postgres:postgres@postgres:5432/...`). |
| `pg_dump: error: connection to server … failed` | Staging URL unreachable or credentials incorrect | Double-check VPN/allowlist and credentials used in `STAGING_DB_URL`. |

## Safety notes
- The script **drops every local database defined in `config/database.yml`**. Back up anything important beforehand.
- Keep staging credentials secure; avoid committing them to `.env` files or shell history (use a password manager or environment manager like `mise`).
- If you only need the dump file, you can run the `pg_dump` section manually and skip the destructive steps.

## Related files
- `scripts/sync_staging_to_dev.sh` – automation script described here.
- `config/database.yml` – defines the databases the script resets.
