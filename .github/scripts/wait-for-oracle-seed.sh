#!/bin/bash

# Waits until the oracledb compose service has finished running the seed scripts
# mounted at /opt/oracle/scripts/startup.
#
# The image healthcheck only reports that the PDB is open, which happens before
# those scripts run, so tests that read seeded rows can start against an empty
# database. This polls for the last row inserted by the final seed script
# (009_setup_workorders_blank_workarea.sql) instead.

set -eo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
SERVICE="${ORACLE_SERVICE:-oracledb}"
TIMEOUT_SECONDS="${ORACLE_SEED_TIMEOUT_SECONDS:-900}"
POLL_INTERVAL_SECONDS="${ORACLE_SEED_POLL_INTERVAL_SECONDS:-5}"

# Last row committed by the final seed script.
SENTINEL_QUERY="SELECT COUNT(*) FROM pega_data.index_ac_workschedule WHERE pyid='WS-2807';"

echo "[INF] Waiting for oracledb seed scripts to complete..."
echo "[INF] - compose file: $COMPOSE_FILE"
echo "[INF] - timeout: ${TIMEOUT_SECONDS}s"

# Echoes the sentinel row count, or nothing at all when the database cannot be
# queried yet.
#
# SQL*Plus reports connection and permission problems as ORA-/SP2-/TNS- text on
# STDOUT, not stderr. Scraping digits out of that text yields a number, so an
# error has to be rejected explicitly rather than parsed: before 001_setup_local
# _database.sql creates pega_data, the connection fails with ORA-01017 and
# "01017" would otherwise be read as a positive row count, ending the wait
# seconds after the container starts and letting tests run against a database
# with no seed data in it.
count_sentinel_rows() {
    local output trimmed

    output="$(docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
        sqlplus -s "pega_data/password@//localhost:1521/FREEPDB1" <<SQL 2>/dev/null
set heading off
set pagesize 0
set feedback off
whenever sqlerror exit failure
$SENTINEL_QUERY
exit
SQL
)" || return 1

    # Any Oracle or SQL*Plus diagnostic means "not ready yet", never a count.
    if grep -qE '(ORA|SP2|TNS)-[0-9]+' <<<"$output"; then
        return 1
    fi

    # Accept only a bare integer, so unexpected output is never read as a count.
    trimmed="${output//[[:space:]]/}"
    [[ $trimmed =~ ^[0-9]+$ ]] || return 1

    printf '%s' "$trimmed"
}

DEADLINE=$((SECONDS + TIMEOUT_SECONDS))

while true; do
    ROWS="$(count_sentinel_rows || true)"

    # 10# forces base 10: a count that arrives zero-padded would otherwise be
    # read as octal, and anything containing an 8 or 9 would abort the script.
    if [[ -n $ROWS ]] && ((10#$ROWS > 0)); then
        echo "[INF] Seed data is present. Database is ready."
        exit 0
    fi

    if ((SECONDS >= DEADLINE)); then
        echo "[ERR] Timed out after ${TIMEOUT_SECONDS}s waiting for seed data."
        echo "[ERR] Last 50 lines of oracledb logs:"
        docker compose -f "$COMPOSE_FILE" logs --tail 50 "$SERVICE" || true
        exit 1
    fi

    echo "[INF] Not seeded yet, retrying in ${POLL_INTERVAL_SECONDS}s... (${SECONDS}s elapsed)"
    sleep "$POLL_INTERVAL_SECONDS"
done
