#!/bin/bash

# Waits until the oracledb compose service has finished running the seed scripts
# mounted at /opt/oracle/scripts/startup.
#
# The image healthcheck only reports that the PDB is open, which happens before
# those scripts run, so tests that read seeded rows can start against an empty
# database. This polls for the last row inserted by the final seed script
# (008_setup_workorders_livestock_ordering.sql) instead.

set -eo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
SERVICE="${ORACLE_SERVICE:-oracledb}"
TIMEOUT_SECONDS="${ORACLE_SEED_TIMEOUT_SECONDS:-900}"
POLL_INTERVAL_SECONDS="${ORACLE_SEED_POLL_INTERVAL_SECONDS:-5}"

# Last row committed by the final seed script.
SENTINEL_QUERY="SELECT COUNT(*) FROM pega_data.index_ac_wsentities WHERE pyid='WS-76724';"

echo "[INF] Waiting for oracledb seed scripts to complete..."
echo "[INF] - compose file: $COMPOSE_FILE"
echo "[INF] - timeout: ${TIMEOUT_SECONDS}s"

count_sentinel_rows() {
    docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
        sqlplus -s "pega_data/password@//localhost:1521/FREEPDB1" <<SQL 2>/dev/null | tr -dc '0-9'
set heading off
set pagesize 0
set feedback off
whenever sqlerror exit failure
$SENTINEL_QUERY
exit
SQL
}

DEADLINE=$((SECONDS + TIMEOUT_SECONDS))

while true; do
    ROWS="$(count_sentinel_rows || true)"

    if [[ -n $ROWS && $ROWS -gt 0 ]]; then
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
